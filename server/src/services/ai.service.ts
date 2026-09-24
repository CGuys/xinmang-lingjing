import { Response } from 'express';
import axios from 'axios';
import { prisma } from '../models/prisma';
import { ConfigService } from './config.service';
import { TarotService } from './tarot.service';
import { AppError } from '../middlewares/error.middleware';

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
    res: Response
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

    // 设置 SSE 标准响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendSseEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendSseEvent({ type: 'start', reading_id: readingId });

    // 检查微信审核模式
    const strategy = await ConfigService.getStrategyConfig();
    const isInReview = Boolean(strategy.is_in_review);

    const cardMeta = TarotService.getCardByIndex(reading.card_id);
    const orientationLabel = reading.orientation === 'reversed' ? '逆位' : '正位';

    let fullText = '';

    // 审核模式或预置降级文案
    if (isInReview) {
      fullText = `【今日心灵定调】：平整心境 · 观照当下\n\n今日为你映照的是【${reading.card_name} · ${orientationLabel}】。\n微风不燥，万物有序。无论当下的生活节奏多么繁忙，请在心底留有一方安宁的小角落。你已经走过了很长的路，每一步的积累与坚持都蕴含着生命的力量。\n\n【思维盲区与转念】：\n不必强求每件事情都在此刻给出确定无疑的答案，允许自己有未完成的时刻，也是一种从容的智慧。\n\n【正念行动微建议】：\n给自己倒一杯温水，深呼吸三次，由衷地对自己说一句“今天辛苦了”。`;
      await this.typewriterStream(fullText, sendSseEvent, res);
      await this.finalizeReading(readingId, fullText);
      sendSseEvent({ type: 'done', full_text: fullText });
      res.end();
      return;
    }

    // 如果已经完成了解读，直接回放
    if (reading.status === 'completed' && reading.reading_result) {
      await this.typewriterStream(reading.reading_result, sendSseEvent, res);
      sendSseEvent({ type: 'done', full_text: reading.reading_result });
      res.end();
      return;
    }

    // 正常模式：获取 AI 配置
    const aiConfig = await ConfigService.getAiConfig();

    // 尝试调用真实大模型服务
    if (aiConfig.apiKey && aiConfig.apiKey.trim().length > 0) {
      try {
        const userPrompt = `来访者抽到了【${reading.card_name}（${orientationLabel}）】。
来访者当下的困惑或心绪：${reading.user_question || '（来访者未输入具体困惑，请结合生活日常状态进行深度心理观照）'}。
卡牌核心象征：${cardMeta?.tags.join(' / ') || ''}。
卡牌心理投射原型：${cardMeta?.insight || ''}。

请严格根据 System Prompt 的指引和结构进行流式解读：`;

        const completionsUrl = aiConfig.baseUrl.endsWith('/chat/completions')
          ? aiConfig.baseUrl
          : `${aiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;

        const response = await axios({
          method: 'post',
          url: completionsUrl,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiConfig.apiKey}`
          },
          data: {
            model: aiConfig.model || 'deepseek-chat',
            messages: [
              { role: 'system', content: aiConfig.systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: aiConfig.temperature || 0.7,
            top_p: aiConfig.topP || 0.9,
            max_tokens: aiConfig.maxTokens || 1000,
            stream: true
          },
          responseType: 'stream',
          timeout: 60000
        });

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            if (trimmed === 'data: [DONE]') {
              continue;
            }

            try {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                sendSseEvent({ type: 'chunk', text: content });
              }
            } catch (e) {
              // 忽略解析片段异常
            }
          }
        });

        await new Promise((resolve, reject) => {
          response.data.on('end', resolve);
          response.data.on('error', reject);
        });

        await this.finalizeReading(readingId, fullText);
        sendSseEvent({ type: 'done', full_text: fullText });
        res.end();
        return;
      } catch (err: any) {
        console.warn('⚠️ 真实大模型 API 通信异常，自动无缝降级为心理学知识库生成流:', err.message);
        // 出错降级至优质心理学模版打字机流
      }
    }

    // 默认高质心理学投射模版打字机流（开发与免外部 Key 运行环境）
    const tagsStr = (cardMeta?.tags || ['觉察', '接纳']).join(' · ');
    fullText = `【今日心灵定调】：${tagsStr}\n\n` +
      `【意象投射与潜意识映射】：\n` +
      `今日抽得【${reading.card_name} · ${orientationLabel}】。${cardMeta?.insight || '卡牌映照出你内心深处正在积聚的力量。'}当下的困惑“${reading.user_question || '内在的探索与求变'}”，正是潜意识在提醒你：外部环境的纷扰只是倒影，真正的破局钥匙始终握在你自己手中。\n\n` +
      `【思维盲区与视角转念】：\n` +
      `你可能习惯了用过去的经验来丈量未来的可能性，从而感到暂时的踟蹰。${cardMeta?.challenge || '试着从评价自己转变为观察自己，允许情绪像水流一样自然穿过。'}\n\n` +
      `【正念行动微建议】：\n` +
      `1. ${cardMeta?.guidance || '在日记本上写下一件今天最让你感到踏实的小事。'}\n` +
      `2. 心灵真言：“${cardMeta?.affirmation || '我信任生命的韵律，在每一个微小的行动中找回安宁。'}”`;

    await this.typewriterStream(fullText, sendSseEvent, res);
    await this.finalizeReading(readingId, fullText);
    sendSseEvent({ type: 'done', full_text: fullText });
    res.end();
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
