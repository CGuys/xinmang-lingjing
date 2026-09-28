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
     */
    parseStructuredText(raw: string) {
      if (!raw || !raw.trim()) return;

      // 1. 今日心灵定调
      const catMatch = raw.match(/【(?:今日)?(?:心灵|能量)?定调】[：:]?\s*([^\n\r【]+)/);
      if (catMatch && catMatch[1] && catMatch[1].trim()) {
        this.structuredInsight.category = catMatch[1].trim();
      }

      // 2. 意象投射与潜意识映射
      const insightMatch = raw.match(/【(?:意象投射与潜意识映射|潜意识意象投射|潜意识意象|意象投射|心理投射|潜意识)】[：:]?\s*([\s\S]*?)(?=【|$)/);
      if (insightMatch && insightMatch[1] && insightMatch[1].trim()) {
        this.structuredInsight.insight = insightMatch[1].trim();
      } else if (!raw.includes('【') && raw.trim()) {
        this.structuredInsight.insight = raw.trim();
      }

      // 3. 思维盲区与视角转念
      const challengeMatch = raw.match(/【(?:思维盲区与视角转念|思维盲区与转念|思维盲区|挑战与转念)】[：:]?\s*([\s\S]*?)(?=【|$)/);
      if (challengeMatch && challengeMatch[1] && challengeMatch[1].trim()) {
        this.structuredInsight.challenge = challengeMatch[1].trim();
      }

      // 4. 正念行动微建议
      const guidanceMatch = raw.match(/【(?:正念行动微建议|今日正念行动建议|正念行动建议|行动微建议|正念行动|行动建议)】[：:]?\s*([\s\S]*?)(?=【|$)/);
      if (guidanceMatch && guidanceMatch[1] && guidanceMatch[1].trim()) {
        this.structuredInsight.guidance = guidanceMatch[1].trim();
      }

      // 5. 赋能金句 / 心灵真言
      const affMatch = raw.match(/【(?:赋能金句|心灵真言|心灵箴言|赋能箴言|今日金句|真言)】[：:]?\s*[“"']?([^”"'\n\r【]+)[”"']?/);
      if (affMatch && affMatch[1] && affMatch[1].trim()) {
        this.structuredInsight.affirmation = affMatch[1].trim();
      }
    }
  }
});
