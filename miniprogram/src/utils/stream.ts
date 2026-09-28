import { getApiBaseUrl } from './config';

export interface StreamCallbacks {
  onStart?: (readingId: string) => void;
  onChunk?: (chunkText: string, fullText: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

/**
 * 兼容 iOS 微信小程序 JavaScriptCore 的安全 UTF-8 流式分块解码器
 * 自动维护跨分块的多字节字节流缓冲区，支持 ASCII、中文(3字节)与 Emoji(4字节)
 */
class Utf8StreamDecoder {
  private buffer: number[] = [];

  decode(chunk: ArrayBuffer | Uint8Array): string {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }

    let out = '';
    let i = 0;
    const len = this.buffer.length;

    while (i < len) {
      const b0 = this.buffer[i];
      if (b0 < 0x80) {
        // 1 字节 ASCII
        out += String.fromCharCode(b0);
        i++;
      } else if ((b0 & 0xe0) === 0xc0) {
        // 2 字节字符
        if (i + 1 >= len) break; // 字节尚未完全到达，等待下一分块
        const b1 = this.buffer[i + 1];
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        i += 2;
      } else if ((b0 & 0xf0) === 0xe0) {
        // 3 字节常用汉字与符号
        if (i + 2 >= len) break;
        const b1 = this.buffer[i + 1];
        const b2 = this.buffer[i + 2];
        out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        i += 3;
      } else if ((b0 & 0xf8) === 0xf0) {
        // 4 字节 Emoji / 扩展生僻字
        if (i + 3 >= len) break;
        const b1 = this.buffer[i + 1];
        const b2 = this.buffer[i + 2];
        const b3 = this.buffer[i + 3];
        let codePoint = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        // UTF-16 代理对
        codePoint -= 0x10000;
        out += String.fromCharCode((codePoint >> 10) + 0xd800, (codePoint & 0x3ff) + 0xdc00);
        i += 4;
      } else {
        // 无效字节，跳过
        i++;
      }
    }

    if (i > 0) {
      this.buffer = this.buffer.slice(i);
    }
    return out;
  }
}

/**
 * 跨端 SSE 流式客户端
 * 支持微信小程序 wx.request(enableChunked: true) 与 H5 Fetch 流
 */
export function streamTarotReading(
  readingId: string,
  callbacks: StreamCallbacks
): () => void {
  const baseUrl = getApiBaseUrl();
  const token = uni.getStorageSync('token') || '';
  const url = `${baseUrl}/api/v1/tarot/stream/${readingId}`;

  let accumulated = '';
  let isAborted = false;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) return;
    const jsonStr = trimmed.replace(/^data:\s*/, '');
    try {
      const data = JSON.parse(jsonStr);
      if (data.type === 'start') {
        callbacks.onStart?.(data.reading_id || readingId);
      } else if (data.type === 'chunk') {
        accumulated += data.text || '';
        callbacks.onChunk?.(data.text || '', accumulated);
      } else if (data.type === 'done') {
        const result = data.full_text || accumulated;
        callbacks.onDone?.(result);
      } else if (data.type === 'error') {
        callbacks.onError?.(new Error(data.message || '大模型解读链路异常'));
      }
    } catch {
      // 容错处理纯文本帧
      if (trimmed.length > 5) {
        const text = trimmed.substring(5);
        accumulated += text;
        callbacks.onChunk?.(text, accumulated);
      }
    }
  };

  // 微信小程序原生环境判断
  // @ts-ignore
  if (typeof wx !== 'undefined' && typeof wx.request === 'function') {
    let bufferStr = '';
    const utf8Decoder = new Utf8StreamDecoder();

    // @ts-ignore
    const task = wx.request({
      url,
      method: 'GET',
      header: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`
      },
      enableChunked: true,
      responseType: 'arraybuffer', // iOS 真机流式必须显式指定为 arraybuffer
      success: () => {
        if (!isAborted) {
          callbacks.onDone?.(accumulated);
        }
      },
      fail: (err: any) => {
        if (!isAborted) {
          console.error('[wx.request stream failed]', err);
          callbacks.onError?.(new Error(err.errMsg || '流式连接中断'));
        }
      }
    });

    // 监听二进制分块数据
    task.onChunkReceived((res: { data: ArrayBuffer }) => {
      if (isAborted || !res.data) return;
      try {
        const chunkStr = utf8Decoder.decode(res.data);
        if (!chunkStr) return;

        bufferStr += chunkStr;
        const lines = bufferStr.split('\n');
        bufferStr = lines.pop() || '';
        for (const line of lines) {
          handleLine(line);
        }
      } catch (err: any) {
        console.warn('[Chunk decode error]', err);
      }
    });

    return () => {
      isAborted = true;
      try {
        task.abort();
      } catch {
        // ignore
      }
    };
  }

  // H5 / 浏览器开发环境
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error('ReadableStream not supported.');
        }

        const reader = response.body.getReader();
        const decoder = new Utf8StreamDecoder();
        let buffer = '';

        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            handleLine(line);
          }
        }
        if (!isAborted) {
          callbacks.onDone?.(accumulated);
        }
      })
      .catch((err) => {
        if (!isAborted) {
          callbacks.onError?.(err);
        }
      });

    return () => {
      isAborted = true;
      controller.abort();
    };
  }

  callbacks.onError?.(new Error('当前运行环境不支持流式传输'));
  return () => {};
}
