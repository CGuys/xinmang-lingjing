import { Response } from 'express';
import axios from 'axios';
import { prisma } from '../models/prisma';
import { ConfigService } from './config.service';
import { TarotService } from './tarot.service';
import { UserService } from './user.service';
import { AppError } from '../middlewares/error.middleware';

import { DEFAULT_AI_CONFIG } from '../config/constants';

export class AiService {
  /**
   * 组装 Prompt
   */
  static assemblePrompt(
    template: string,
    params: {
      cardName: string;
      orientation: string;
      question?: string;
      insight?: string;
      tags?: string[];
    }
  ) {
    let result = template;
    result = result.replace(/\{card_name\}/g, params.cardName);
    result = result.replace(/\{orientation\}/g, params.orientation);
    result = result.replace(/\{question\}/g, params.question || '（来访者未提供具体困惑，聚焦于当下身心状态观照）');
    result = result.replace(/\{insight\}/g, params.insight || '');
    result = result.replace(/\{tags\}/g, (params.tags || []).join('、'));
    return result;
  }

  /**
   * 测试大模型网关连通性
   */
  static async testConnection(params?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    provider?: string;
  }) {
    const config = await ConfigService.getAiConfig();
    const provider = params?.provider || config.provider || 'deepseek';
    const providerNames: Record<string, string> = {
      zhipu: '智谱 AI',
      siliconflow: '硅基流动',
      dashscope: '阿里云百炼',
      qianfan: '百度千帆',
      deepseek: 'DeepSeek',
      openai: 'OpenAI / 自定义'
    };
    const providerName = providerNames[provider] || (provider ? provider.toUpperCase() : '默认网关');
    const rawBase = (params?.baseUrl || config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    const apiKey = params?.apiKey !== undefined ? params.apiKey.trim() : (config.apiKey || '').trim();
    const model = (params?.model || config.model || 'deepseek-chat').trim();

    if (!apiKey) {
      return {
        ok: false,
        status: 'API_KEY_EMPTY',
        provider,
        providerName,
        model,
        message: '未配置 API Key，大模型网关当前处于【内置离线高精度心理学疗愈引擎】自闭环模式',
        latencyMs: 0
      };
    }

    const startTime = Date.now();
    let balanceInfo: any = null;

    // 针对 DeepSeek 官方，先做余额探针
    if (rawBase.includes('deepseek.com')) {
      try {
        const balRes = await axios.get('https://api.deepseek.com/user/balance', {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 5000
        });
        balanceInfo = balRes.data;
      } catch (e) {
        // ignore
      }
    }

    // 格式化 completions 地址
    const completionsUrl = rawBase.endsWith('/chat/completions')
      ? rawBase
      : `${rawBase}/chat/completions`;

    try {
      const res = await axios.post(
        completionsUrl,
        {
          model,
          messages: [{ role: 'user', content: '心芒灵境大模型网关连通性测试，请回复 OK。' }],
          max_tokens: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 12000
        }
      );

      const latencyMs = Date.now() - startTime;
      return {
        ok: true,
        status: 'CONNECTED',
        provider,
        providerName,
        model,
        latencyMs,
        modelUsed: model,
        message: `大模型 API 网关通信与推理完全正常！往返耗时 ${latencyMs}ms`,
        balance: balanceInfo,
        sampleOutput: res.data?.choices?.[0]?.message?.content || ''
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const resData = err.response?.data;
      const errMsg = resData?.error?.message || err.message;

      if (errMsg?.includes('Insufficient Balance') || balanceInfo?.is_available === false) {
        return {
          ok: false,
          status: 'INSUFFICIENT_BALANCE',
          provider,
          providerName,
          model,
          latencyMs,
          message: '网关链路通信成功且密钥鉴权通过，但该 DeepSeek 账户余额不足 (0.00 元)，大模型已拒绝生成。充值后方可真实吐字，未充值前系统会自动降级为内置心理学引擎。',
          balance: balanceInfo,
          errorDetail: resData
        };
      }

      if (err.response?.status === 401) {
        return {
          ok: false,
          status: 'INVALID_API_KEY',
          provider,
          providerName,
          model,
          latencyMs,
          message: 'API Key 无效或未授权，请检查输入的密钥是否正确。',
          errorDetail: resData
        };
      }

      if (err.response?.status === 404) {
        return {
          ok: false,
          status: 'MODEL_NOT_FOUND',
          provider,
          providerName,
          model,
          latencyMs,
          message: `未找到模型【${model}】。DeepSeek 官方模型为 deepseek-chat 或 deepseek-reasoner，请检查模型名称。`,
          errorDetail: resData
        };
      }

      return {
        ok: false,
        status: 'FAILED',
        provider,
        providerName,
        model,
        latencyMs,
        message: `大模型网关连接异常: ${errMsg}`,
        errorDetail: resData
      };
    }
  }

  /**
   * 处理 SSE 流式解读推流
   */
  static async streamReading(
    readingId: string,
    userId: string | null,
    res: Response,
    options?: {
      isSandbox?: boolean;
      overrideConfig?: {
        provider?: string;
        model?: string;
        baseUrl?: string;
        apiKey?: string;
        systemPrompt?: string;
        temperature?: number;
      };
    }
  ) {
    const reading = await prisma.tarotReading.findUnique({
      where: { id: readingId }
    });

    if (!reading) {
      throw new AppError('解牌记录不存在', 404, 'READING_NOT_FOUND');
    }

    // 若非管理员且有用户 ID，则校验归属
    if (userId && reading.user_id !== userId) {
      throw new AppError('无权访问该解牌记录', 403, 'FORBIDDEN');
    }

    // 设置 SSE 标准响应头 (严格保障 iOS 微信小程序与 Web 端的流式传输)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.flushHeaders?.();

    const sendSseEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendSseEvent({ type: 'start', reading_id: readingId });

    // 提取抽牌时暂存的能量扣减类型（若后续大模型推理失败则精准返还）
    let energyType = 'free';
    if (reading.reading_result) {
      try {
        const parsedMeta = JSON.parse(reading.reading_result);
        if (parsedMeta.energyType) energyType = parsedMeta.energyType;
      } catch (e) {
        // 非 JSON 元数据
      }
    }

    const cardMeta = TarotService.getCardByIndex(reading.card_id);
    const orientationLabel = reading.orientation === 'reversed' ? '逆位' : '正位';

    // 如果已经成功完成了解读且非沙盒调试，直接回放真实解读
    if (!options?.isSandbox && reading.status === 'completed' && reading.reading_result && !reading.reading_result.startsWith('{')) {
      await this.typewriterStream(reading.reading_result, sendSseEvent, res);
      sendSseEvent({ type: 'done', full_text: reading.reading_result });
      res.end();
      return;
    }

    // 获取 AI 编排配置
    let aiConfig = await ConfigService.getAiConfig();
    if (options?.overrideConfig) {
      const overrides: Record<string, any> = {};
      for (const [k, v] of Object.entries(options.overrideConfig)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          overrides[k] = v;
        }
      }
      aiConfig = { ...aiConfig, ...overrides };
    }

    const activeSystemPrompt = (aiConfig.systemPrompt && aiConfig.systemPrompt.trim()) 
      ? aiConfig.systemPrompt.trim() 
      : DEFAULT_AI_CONFIG.systemPrompt;

    let fullText = '';

    // 真实大模型调用链路 (优先 GLM / DeepSeek / 通用兼容端点)
    if (aiConfig.apiKey && aiConfig.apiKey.trim().length > 0) {
      try {
        const userPrompt = `来访者抽到了【${reading.card_name}（${orientationLabel}）】。
来访者当下的困惑或心绪：${reading.user_question || '（来访者未输入具体困惑，请结合当下生活与内心状态进行深度心理观照）'}。
卡牌核心象征：${cardMeta?.tags?.join(' / ') || ''}。
卡牌心理投射原型：${cardMeta?.insight || ''}。

【解读要求】：
请严格根据 System Prompt 的五段结构进行流式解读。特别在【正念行动微建议】部分，必须针对来访者的困惑与本张卡牌特质给出 2 条深度定制、互不相同的具体方案，严格输出两行，直接以“1. ”和“2. ”开头输出具体建议内容（严禁出现“1. 1.”等重复序号，严禁包含“深度反思：”、“模拟实验：”、“模拟实现：”等任何小标题或冒号标签，直接输出正文内容），杜绝“与信任的朋友或家人讨论”、“寻求专业人士交流”等千篇一律的模板套话！`;

        const rawBase = (aiConfig.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
        const completionsUrl = rawBase.endsWith('/chat/completions')
          ? rawBase
          : `${rawBase}/chat/completions`;

        // 智能模型切换与容错：构建高可用备选候选模型链
        const configuredModel = (aiConfig.model || 'glm-4-flash').trim();
        const candidateModels: string[] = [];
        if (configuredModel === 'glm-4.7-flash') {
          // 4.7-flash 官方并发压力大易报 1305，优先使用极速稳定的 glm-4-flash / glm-4-flashx 作为主力
          candidateModels.push('glm-4-flash', 'glm-4-flashx', 'glm-4.7-flash');
        } else {
          candidateModels.push(configuredModel);
          if (configuredModel === 'glm-4-flash') {
            candidateModels.push('glm-4-flashx');
          } else if (configuredModel.includes('glm')) {
            candidateModels.push('glm-4-flash', 'glm-4-flashx');
          }
        }

        let streamSucceeded = false;
        let lastErrorMsg = '';

        for (const candidate of candidateModels) {
          fullText = '';
          try {
            const response = await axios({
              method: 'post',
              url: completionsUrl,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${aiConfig.apiKey.trim()}`
              },
              data: {
                model: candidate,
                messages: [
                  { role: 'system', content: activeSystemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                temperature: aiConfig.temperature || 0.7,
                top_p: aiConfig.topP || 0.9,
                max_tokens: aiConfig.maxTokens || 1000,
                stream: true
              },
              responseType: 'stream',
              timeout: 45000
            });

            // 维护行缓冲区，防止 TCP 分包切断 JSON 行
            let streamBuffer = '';
            await new Promise<void>((resolve, reject) => {
              response.data.on('data', (chunk: Buffer) => {
                streamBuffer += chunk.toString('utf8');
                const lines = streamBuffer.split('\n');
                streamBuffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data:')) continue;
                  if (trimmed === 'data: [DONE]' || trimmed === 'data:[DONE]') {
                    continue;
                  }

                  try {
                    const jsonStr = trimmed.replace(/^data:\s*/, '');
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error) {
                      console.warn(`[AiService] 模型【${candidate}】流内返回错误:`, parsed.error);
                      continue;
                    }
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                      fullText += content;
                      sendSseEvent({ type: 'chunk', text: content });
                    }
                  } catch (e) {
                    // 忽略不完整片段
                  }
                }
              });

              response.data.on('end', () => resolve());
              response.data.on('error', (err: any) => reject(err));
            });

            if (fullText && fullText.trim().length > 0) {
              streamSucceeded = true;
              break;
            } else {
              console.warn(`[AiService] 模型【${candidate}】未产生有效输出内容，自动切换备选模型...`);
            }
          } catch (e: any) {
            lastErrorMsg = e.response?.data?.error?.message || e.message;
            console.warn(`[AiService] 模型【${candidate}】调用失败 (${lastErrorMsg})，自动尝试备选模型...`);
          }
        }

        if (!streamSucceeded || !fullText || fullText.trim().length === 0) {
          throw new Error(lastErrorMsg || '大模型未产生有效输出内容');
        }

        // 解读成功：固化记录为 completed
        await this.finalizeReading(readingId, fullText);
        sendSseEvent({ type: 'done', full_text: fullText });
        res.end();
        return;
      } catch (err: any) {
        console.error('❌ [AiService] 真实大模型 API 通信或推理失败:', err.message);

        // 如果用户是非沙盒真实小程序用户，坚决不吐 Mock 伪数据，而是立即退还用户能量并通知前端
        if (!options?.isSandbox) {
          await UserService.refundEnergy(reading.user_id, energyType);
          await prisma.tarotReading.update({
            where: { id: readingId },
            data: { status: 'failed' }
          });

          sendSseEvent({
            type: 'error',
            message: '大模型解读链路波动，本次未成功生成，已为您自动返还今日灵感点。',
            refunded: true
          });
          res.end();
          return;
        } else {
          // 沙盒调试模式下给出显式错误提示
          const errMsg = err.response?.data?.error?.message || err.message;
          sendSseEvent({
            type: 'chunk',
            text: `\n\n> ⚠️【大模型调用异常】: ${errMsg}\n\n`
          });
        }
      }
    } else {
      // 未配置 API Key 时
      if (!options?.isSandbox) {
        await UserService.refundEnergy(reading.user_id, energyType);
        await prisma.tarotReading.update({
          where: { id: readingId },
          data: { status: 'failed' }
        });
        sendSseEvent({
          type: 'error',
          message: '未配置大模型 API Key，已自动返还灵感点。请在管理后台配置大模型凭据。',
          refunded: true
        });
        res.end();
        return;
      }
    }

  }

  /**
   * 模拟打字机微延迟流推送到客户端
   */
  private static async typewriterStream(
    fullText: string,
    sendSseEvent: (data: any) => void,
    res: Response
  ) {
    const chunkSize = 4; // 每次输出 4 字符
    const delay = process.env.NODE_ENV === 'test' ? 2 : 12;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      if (res.writableEnded || res.destroyed) break;
      const slice = fullText.slice(i, i + chunkSize);
      sendSseEvent({ type: 'chunk', text: slice });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  /**
   * 更新抽牌状态并固化结果
   */
  private static async finalizeReading(readingId: string, fullText: string) {
    await prisma.tarotReading.update({
      where: { id: readingId },
      data: {
        reading_result: fullText,
        status: 'completed'
      }
    });
  }
}
