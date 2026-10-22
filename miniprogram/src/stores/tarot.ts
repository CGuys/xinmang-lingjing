import { defineStore } from 'pinia';
import { apiDrawCard, apiGetCardResource, apiGetReading } from '../api/tarot';
import { streamTarotReading } from '../utils/stream';
import { useUserStore } from './user';
import type { TarotCard, StructuredInsight, DrawCardResult } from '../types';

export const useTarotStore = defineStore('tarot', {
  state: () => ({
    currentReadingId: uni.getStorageSync('last_reading_id') || '',
    currentCard: null as TarotCard | null,
    cardBackOssUrl: uni.getStorageSync('cached_card_back_oss') || '',
    currentQuestion: '',
    streamingRawText: '',
    isStreaming: false,
    isStreamDone: false,
    streamError: '',
    structuredInsight: {
      category: '',
      insight: '',
      challenge: '',
      guidance: '',
      affirmation: ''
    } as StructuredInsight,
    abortStreamFn: null as (() => void) | null
  }),

  getters: {
    // 获取卡牌背面 OSS 资源链接
    cardBackUrl: (state) => state.cardBackOssUrl,

    // 当前大模型字节流正在吐字的活跃板块
    currentActiveSection(state): 'category' | 'insight' | 'challenge' | 'guidance' | 'affirmation' | '' {
      const raw = state.streamingRawText;
      if (!raw) return '';
      if (raw.includes('【赋能金句') || raw.includes('【心灵真言') || raw.includes('【心灵箴言')) return 'affirmation';
      if (raw.includes('【正念行动') || raw.includes('【今日正念') || raw.includes('【行动建议')) return 'guidance';
      if (raw.includes('【思维盲区')) return 'challenge';
      if (raw.includes('【意象投射') || raw.includes('【潜意识') || raw.includes('【心理投射')) return 'insight';
      if (raw.includes('【今日心灵定调') || raw.includes('【心灵定调') || raw.includes('【核心能量')) return 'category';
      return 'insight';
    }
  },

  actions: {
    /**
     * 从后台获取卡背通用艺术 OSS 直链资源
     */
    async fetchCardBackResource(): Promise<string> {
      try {
        const res = await apiGetCardResource('0');
        const ossUrl = res?.assets?.back?.imageUrl || res?.card?.backImage || '';
        if (ossUrl) {
          this.cardBackOssUrl = ossUrl;
          uni.setStorageSync('cached_card_back_oss', ossUrl);
        }
        return this.cardBackOssUrl;
      } catch (e) {
        console.warn('[fetchCardBackResource error]', e);
        return this.cardBackOssUrl;
      }
    },

    /**
     * 发起真实抽牌与能量扣减（后台接口返回包含正面与背面卡片的完整 OSS 资源）
     */
    async drawCard(question = ''): Promise<DrawCardResult> {
      const userStore = useUserStore();
      this.currentQuestion = question;
      this.streamingRawText = '';
      this.isStreaming = false;
      this.isStreamDone = false;
      this.streamError = '';
      this.resetStructuredInsight();

      const result = await apiDrawCard(question);
      this.currentReadingId = result.readingId;
      uni.setStorageSync('last_reading_id', result.readingId);
      this.currentCard = result.card;

      // 持久化后台返回的卡牌背面 OSS 资源
      if (result.card?.backImage) {
        this.cardBackOssUrl = result.card.backImage;
        uni.setStorageSync('cached_card_back_oss', result.card.backImage);
      }

      // 实时同步用户能量
      await userStore.fetchProfile();

      return result;
    },

    /**
     * 根据 ID 获取抽牌与解读详情（核心兜底机制，杜绝任何空白页）
     */
    async fetchReading(readingId?: string) {
      const targetId = readingId || this.currentReadingId || uni.getStorageSync('last_reading_id');
      if (!targetId) return null;

      try {
        const record = await apiGetReading(targetId);
        if (record) {
          this.currentReadingId = record.id;
          uni.setStorageSync('last_reading_id', record.id);
          if (record.card) {
            this.currentCard = record.card;
            if (record.card.backImage) {
              this.cardBackOssUrl = record.card.backImage;
            }
          }
          if (record.userQuestion) {
            this.currentQuestion = record.userQuestion;
          }
          if (record.readingResult && record.readingResult.trim() && !record.readingResult.startsWith('{')) {
            this.streamingRawText = record.readingResult;
            this.parseStructuredText(record.readingResult);
            this.isStreamDone = true;
            this.isStreaming = false;
            this.streamError = '';
          }
        }
        return record;
      } catch (err: any) {
        console.warn('[fetchReading error]', err);
        return null;
      }
    },

    /**
     * 设置当前活跃卡牌（如从历史记录点击进入）
     */
    setActiveCard(card: TarotCard, question = '', readingId = '') {
      this.currentCard = card;
      this.currentQuestion = question;
      this.currentReadingId = readingId;
      if (readingId) {
        uni.setStorageSync('last_reading_id', readingId);
      }
      this.streamError = '';
      if (card?.backImage) {
        this.cardBackOssUrl = card.backImage;
      }
    },

    /**
     * 启动真实大模型流式解读推流
     */
    startStreamingReading(readingId?: string): Promise<string> {
      const targetId = readingId || this.currentReadingId || uni.getStorageSync('last_reading_id');
      if (!targetId) {
        return Promise.reject(new Error('未找到当前抽牌记录 ID'));
      }
      this.currentReadingId = targetId;

      if (this.abortStreamFn) {
        this.abortStreamFn();
        this.abortStreamFn = null;
      }

      this.streamingRawText = '';
      this.isStreaming = true;
      this.isStreamDone = false;
      this.streamError = '';
      this.resetStructuredInsight();

      return new Promise((resolve, reject) => {
        let hasReceivedAnyChunk = false;

        this.abortStreamFn = streamTarotReading(targetId, {
          onStart: () => {
            this.isStreaming = true;
          },
          onChunk: (_chunkText, fullText) => {
            hasReceivedAnyChunk = true;
            this.streamingRawText = fullText;
            this.parseStructuredText(fullText);
          },
          onDone: async (fullText) => {
            this.streamingRawText = fullText;
            this.parseStructuredText(fullText);
            this.isStreaming = false;
            this.isStreamDone = true;
            this.abortStreamFn = null;

            // 兜底保障：若微信小程序 iOS 端因网络或缓冲区未累积到文本，则向后台发起全量同步
            const hasInsight = Boolean(
              this.structuredInsight.category ||
              this.structuredInsight.insight ||
              this.structuredInsight.challenge ||
              this.structuredInsight.guidance ||
              this.structuredInsight.affirmation
            );
            if (!hasInsight) {
              await this.fetchReading(targetId);
            }

            resolve(this.streamingRawText || fullText);
          },
          onError: async (err) => {
            console.error('[Stream Error]', err);
            this.abortStreamFn = null;

            // 检查后台是否其实已经生成完成（如推流被中间断开）
            const record = await this.fetchReading(targetId);
            const hasInsight = Boolean(
              this.structuredInsight.category ||
              this.structuredInsight.insight ||
              this.structuredInsight.challenge ||
              this.structuredInsight.guidance ||
              this.structuredInsight.affirmation
            );

            if (hasInsight) {
              this.isStreaming = false;
              this.isStreamDone = true;
              this.streamError = '';
              resolve(this.streamingRawText);
              return;
            }

            this.isStreaming = false;
            this.streamError = err.message || '大模型解读中断，已自动返还灵感点';

            // 失败时，后端已自动回滚返还灵感点，前台即时拉取最新资产
            const userStore = useUserStore();
            await userStore.fetchProfile();

            reject(err);
          }
        });
      });
    },

    stopStreaming() {
      if (this.abortStreamFn) {
        this.abortStreamFn();
        this.abortStreamFn = null;
      }
      this.isStreaming = false;
    },

    resetStructuredInsight() {
      this.structuredInsight = {
        category: '',
        insight: '',
        challenge: '',
        guidance: '',
        affirmation: ''
      };
    },

    /**
     * 实时精准解析大模型五段式内容（严格保证真实大模型输出，杜绝任何默认与 Mock 填充）
     * 1. 彻底防泄漏：严禁下一个板块的标题（如【思维盲区...】）出现在前一个板块末尾
     * 2. 彻底去除【】：正念行动建议全面剔除任何【】分类标签与小标题，仅保留纯粹可落地的编号行动
     */
    parseStructuredText(raw: string) {
      if (!raw || !raw.trim()) return;

      const HEADER_2 = '【(?:意象投射与潜意识映射|潜意识意象投射|潜意识映射|潜意识意象|意象投射|心理投射|潜意识)】';
      const HEADER_3 = '【(?:思维盲区与视角转念|思维盲区与转念|认知盲区与转念|思维盲区|视角转念|认知盲区|挑战与转念)】';
      const HEADER_4 = '【(?:正念行动微建议|今日正念行动建议|正念行动建议|正念微行动|行动微建议|正念行动|行动建议)】';
      const HEADER_5 = '【(?:赋能金句|心灵真言|心灵箴言|赋能箴言|今日金句|心灵金句|真言)】';

      // 辅助清洗函数：剥离末尾正在流入的下一个板块的开头，防止下一板块标题泄漏到当前板块末尾
      const cleanTrailingHeader = (text: string) => {
        if (!text) return '';
        let cleaned = text.replace(/\s*【[^】\n\r]*$/, '');
        cleaned = cleaned.replace(/\s*【(?:思维盲区|视角转念|认知盲区|正念行动|行动微建议|行动建议|赋能金句|心灵真言|今日金句|真言)[^】\n\r]*】[：:]?\s*$/, '');
        return cleaned.trim();
      };

      // 彻底清洗正念行动建议：去除多余重复序号（如 1. 1.）及各类小标题标签（如 深度反思：、模拟实验：、模拟实现：、心智练习：等），直接保留纯粹正文
      const cleanGuidanceContent = (text: string) => {
        if (!text) return '';
        const rawParagraphs = text.split(/\n+/);
        const cleanedParagraphs = rawParagraphs.map(p => {
          let l = p.trim();
          if (!l) return '';

          // 匹配 1. 或 2. 等序号开头的条目
          const numMatch = l.match(/^(\d+[\.、]\s*)(.*)$/);
          if (numMatch) {
            const numPrefix = numMatch[1].replace('、', '.'); // 统一格式为 1. 或 2.
            let rest = numMatch[2].trim();

            // 1. 去除多余重复出现的序号，如 1. 1. 或 1. 1 或 2. 2.
            rest = rest.replace(/^\d+[\.、]?\s*/, '');

            // 2. 去除【...】及其后的冒号
            rest = rest.replace(/^【[^】]+】[：:]?\s*/, '');

            // 3. 去除各种常见的小标题前缀（如 深度反思：、深度觉察：、模拟实验：、模拟实现：、心智练习：、行为实验：等）
            rest = rest.replace(/^(?:深度反思|深度觉察|模拟实验|模拟实现|行为实验|习惯实验|心智练习|内在觉察|现实行动|认知转念|微习惯)[：:]?\s*/, '');

            // 4. 去除通用的 2-6 字小标题带冒号
            rest = rest.replace(/^[\u4e00-\u9fa5]{2,6}[：:]\s*/, '');

            // 5. 如果处于流式输入中途，正好只打出了小标题词但还没打冒号正文，也提前清除
            rest = rest.replace(/^(?:深度反思|深度觉察|模拟实验|模拟实现|行为实验|习惯实验|心智练习|内在觉察|现实行动)$/, '');

            return numPrefix + rest;
          }

          // 非数字开头的行，同样清洗可能存在的小标题前缀
          l = l.replace(/^【[^】]+】[：:]?\s*/, '');
          l = l.replace(/^(?:深度反思|深度觉察|模拟实验|模拟实现|行为实验|习惯实验|心智练习|内在觉察|现实行动|认知转念|微习惯)[：:]?\s*/, '');
          l = l.replace(/^[\u4e00-\u9fa5]{2,6}[：:]\s*/, '');
          return l;
        }).filter(Boolean);

        return cleanedParagraphs.join('\n\n');
      };

      // 1. 今日心灵定调
      const catMatch = raw.match(new RegExp(`【(?:今日)?(?:核心)?(?:心灵|能量)?(?:定调|主题)】[：:]?\\s*([^\\n\\r]+?)(?=(?:${HEADER_2}|${HEADER_3}|${HEADER_4}|${HEADER_5})|\\n|\\r|$)`));
      if (catMatch && catMatch[1] && catMatch[1].trim()) {
        this.structuredInsight.category = cleanTrailingHeader(catMatch[1].trim().replace(/^[“"']+|[”"']+$/g, ''));
      }

      // 2. 意象投射与潜意识映射
      const insightMatch = raw.match(new RegExp(`${HEADER_2}[：:]?\\s*([\\s\\S]*?)(?=(?:${HEADER_3}|${HEADER_4}|${HEADER_5})|$)`));
      if (insightMatch && insightMatch[1] && insightMatch[1].trim()) {
        this.structuredInsight.insight = cleanTrailingHeader(insightMatch[1].trim());
      } else if (!raw.includes('【') && raw.trim()) {
        this.structuredInsight.insight = cleanTrailingHeader(raw.trim());
      }

      // 3. 思维盲区与视角转念
      const challengeMatch = raw.match(new RegExp(`${HEADER_3}[：:]?\\s*([\\s\\S]*?)(?=(?:${HEADER_4}|${HEADER_5})|$)`));
      if (challengeMatch && challengeMatch[1] && challengeMatch[1].trim()) {
        this.structuredInsight.challenge = cleanTrailingHeader(challengeMatch[1].trim());
      }

      // 4. 正念行动微建议（必须以第5段【赋能金句】或结束符作为边界，且彻底剔除【】分类标签）
      const guidanceMatch = raw.match(new RegExp(`${HEADER_4}[：:]?\\s*([\\s\\S]*?)(?=(?:${HEADER_5})|$)`));
      if (guidanceMatch && guidanceMatch[1] && guidanceMatch[1].trim()) {
        this.structuredInsight.guidance = cleanGuidanceContent(cleanTrailingHeader(guidanceMatch[1].trim()));
      }

      // 5. 赋能金句 / 心灵真言
      const affMatch = raw.match(new RegExp(`${HEADER_5}[：:]?\\s*[“"'\`]?([^”"'\`\\n\\r]+)[”"'\`]?`));
      if (affMatch && affMatch[1] && affMatch[1].trim()) {
        this.structuredInsight.affirmation = affMatch[1].trim().replace(/^[“"']+|[”"']+$/g, '');
      }
    }
  }
});
