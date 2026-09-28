import fs from 'fs';
import path from 'path';
import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/error.middleware';
import { UserService } from './user.service';
import { OssService } from './oss.service';

export interface TarotCardItem {
  index: number;
  name: string;
  nameCn: string;
  nameEn: string;
  slug: string;
  category: string;
  categoryName: string;
  roman?: string | null;
  image: string; // 默认首页 3D 抽牌缩略图 OSS 访问链接
  imageLarge: string; // 结果页/海报页高清大图 OSS 访问链接
  backImage: string; // 卡牌背面 OSS 访问链接
  ossHomeKey: string; // 首页资源在 OSS 上的对象路径
  ossReadingKey: string; // 结果页资源在 OSS 上的对象路径
  ossBackKey: string; // 卡背在 OSS 上的对象路径
  element?: string | null;
  tags: string[];
  quote: string;
  insight: string;
  challenge: string;
  guidance: string;
  affirmation: string;
  orientation?: string;
  orientationName?: string;
}

const cardsFilePath = path.resolve(__dirname, '../data/cards.json');
let cardDeckMemoryCache: TarotCardItem[] = [];
let lastCacheSyncTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 缓存 1 分钟，保证高频性能

export class TarotService {
  /**
   * 格式化数据库中的 TarotCard 模型为运行时卡牌对象，并动态装配 OSS 签名链接
   */
  private static formatCardRecord(record: any): TarotCardItem {
    let parsedTags: string[] = [];
    try {
      parsedTags = typeof record.tags === 'string' ? JSON.parse(record.tags) : (record.tags || []);
    } catch {
      parsedTags = [];
    }

    const homeKey = record.home_image_key || `pages/home/cards/card_${String(record.id).padStart(2, '0')}_${record.slug}.jpg`;
    const readingKey = record.reading_image_key || `pages/reading/cards/card_${String(record.id).padStart(2, '0')}_${record.slug}.jpg`;
    const backKey = record.back_image_key || `pages/home/card_back.jpg`;

    // 动态生成 OSS 访问链接（私有 Bucket 采用带签名的长效安全 URL，公网直接展示）
    const signedHome = OssService.getSignatureUrl(homeKey);
    const signedReading = OssService.getSignatureUrl(readingKey);
    const signedBack = OssService.getSignatureUrl(backKey);

    return {
      index: record.id,
      name: record.name_en,
      nameCn: record.name_cn,
      nameEn: record.name_en,
      slug: record.slug,
      category: record.category,
      categoryName: record.category_name,
      roman: record.roman,
      image: signedHome,
      imageLarge: signedReading,
      backImage: signedBack,
      ossHomeKey: homeKey,
      ossReadingKey: readingKey,
      ossBackKey: backKey,
      element: record.element,
      tags: parsedTags,
      quote: record.quote || '',
      insight: record.insight || '',
      challenge: record.challenge || '',
      guidance: record.guidance || '',
      affirmation: record.affirmation || '',
      orientation: 'upright',
      orientationName: '正位'
    };
  }

  /**
   * 从数据库全量载入 78 张卡牌，并更新内存缓存
   */
  static async loadDeckFromDb(): Promise<TarotCardItem[]> {
    const now = Date.now();
    if (cardDeckMemoryCache.length === 78 && now - lastCacheSyncTime < CACHE_TTL_MS) {
      return cardDeckMemoryCache;
    }

    try {
      const records = await prisma.tarotCard.findMany({
        orderBy: { id: 'asc' }
      });

      if (records && records.length > 0) {
        cardDeckMemoryCache = records.map((r) => this.formatCardRecord(r));
        lastCacheSyncTime = now;
        return cardDeckMemoryCache;
      }
    } catch (err: any) {
      console.warn('[TarotService] 从数据库载入卡牌失败，降级读取本地 cards.json:', err.message);
    }

    // 兜底：若数据库尚未同步，读取本地 cards.json
    if (fs.existsSync(cardsFilePath)) {
      const raw = fs.readFileSync(cardsFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      cardDeckMemoryCache = (parsed.cards || []).map((c: any) => ({
        ...c,
        name: c.nameEn,
        ossHomeKey: `pages/home/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`,
        ossReadingKey: `pages/reading/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`,
        ossBackKey: `pages/home/card_back.jpg`,
        backImage: OssService.getSignatureUrl(`pages/home/card_back.jpg`),
        image: OssService.getSignatureUrl(`pages/home/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`),
        imageLarge: OssService.getSignatureUrl(`pages/reading/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`)
      }));
      lastCacheSyncTime = now;
    }

    return cardDeckMemoryCache;
  }

  /**
   * 同步接口：获取全部卡牌（若未初始化则同步初始化）
   */
  static getAllCards(category?: string): TarotCardItem[] {
    if (cardDeckMemoryCache.length === 0) {
      // 触发异步载入，同时先用 cards.json 提供即时同步数据
      this.loadDeckFromDb();
      if (fs.existsSync(cardsFilePath)) {
        const raw = fs.readFileSync(cardsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        cardDeckMemoryCache = (parsed.cards || []).map((c: any) => ({
          ...c,
          name: c.nameEn,
          ossHomeKey: `pages/home/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`,
          ossReadingKey: `pages/reading/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`,
          ossBackKey: `pages/home/card_back.jpg`,
          backImage: OssService.getSignatureUrl(`pages/home/card_back.jpg`),
          image: OssService.getSignatureUrl(`pages/home/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`),
          imageLarge: OssService.getSignatureUrl(`pages/reading/cards/card_${String(c.index).padStart(2, '0')}_${c.slug}.jpg`)
        }));
      }
    }

    if (!category || category === 'all') return cardDeckMemoryCache;
    return cardDeckMemoryCache.filter((c) => c.category === category);
  }

  /**
   * 根据序号获取单张卡牌详情
   */
  static getCardByIndex(index: number): TarotCardItem | undefined {
    const deck = this.getAllCards();
    return deck.find((c) => c.index === index);
  }

  /**
   * 核心业务能力：根据 AI 给出的文本或卡牌名称，智能识别匹配出对应的卡牌及其页面 OSS 资源图片
   * @param aiTextOrQuery AI 输出的一段话（例如：“你抽到了【女祭司】”），或者用户输入的卡牌名/ID
   */
  static async getCardByAiMatch(aiTextOrQuery: string): Promise<TarotCardItem | null> {
    if (!aiTextOrQuery || !aiTextOrQuery.trim()) return null;
    const deck = await this.loadDeckFromDb();
    const query = aiTextOrQuery.trim();

    // 1. 如果是纯数字 ID (0 ~ 77)
    if (/^\d+$/.test(query)) {
      const idx = parseInt(query, 10);
      const matched = deck.find((c) => c.index === idx);
      if (matched) return matched;
    }

    // 2. 精确匹配中文名或英文名或 slug
    const normalized = query.toLowerCase();
    for (const card of deck) {
      if (
        card.nameCn.toLowerCase() === normalized ||
        card.nameEn.toLowerCase() === normalized ||
        card.slug.toLowerCase() === normalized
      ) {
        return card;
      }
    }

    // 3. 提取括号或书名号中的卡牌名，例如 【愚者】、「女祭司」、“魔术师”
    const bracketMatches = query.match(/[【「“《]([^】」”》]+)[】」”》]/g);
    if (bracketMatches) {
      for (const m of bracketMatches) {
        const cleanName = m.replace(/[【「“《】」”》]/g, '').trim().toLowerCase();
        const found = deck.find(
          (c) =>
            c.nameCn.toLowerCase() === cleanName ||
            c.nameEn.toLowerCase() === cleanName ||
            cleanName.includes(c.nameCn.toLowerCase())
        );
        if (found) return found;
      }
    }

    // 4. 自然语言模糊全文扫描：在 AI 文本中按名称长短降序匹配卡牌名
    // 按名称长度降序排列，优先匹配更长更精确的名称（如“权杖十”优先于“权杖”）
    const sortedDeck = [...deck].sort((a, b) => b.nameCn.length - a.nameCn.length);
    for (const card of sortedDeck) {
      if (query.includes(card.nameCn) || query.toLowerCase().includes(card.nameEn.toLowerCase())) {
        return card;
      }
    }

    // 5. 心理标签或意向关键词匹配
    for (const card of deck) {
      if (card.tags && card.tags.some((t) => query.includes(t))) {
        return card;
      }
    }

    return null;
  }

  /**
   * 检查文本是否包含反迷信违禁词
   */
  static async checkSensitiveWords(text: string): Promise<string | null> {
    if (!text) return null;
    const sensitiveWords = await prisma.sensitiveWord.findMany({
      select: { word: true }
    });

    for (const item of sensitiveWords) {
      if (text.includes(item.word)) {
        return item.word;
      }
    }
    return null;
  }

  /**
   * 抽牌操作：从数据库加载并返回带有完整页面 OSS 资源直链的卡牌
   */
  static async drawCard(userId: string, userQuestion?: string) {
    const trimmedQuestion = (userQuestion || '').trim();

    // 1. 敏感词内容安全审查 (本地字典前置拦截)
    if (trimmedQuestion) {
      if (trimmedQuestion.length > 50) {
        throw new AppError('提问字数请控制在 50 字以内', 400, 'QUESTION_TOO_LONG');
      }

      const matched = await this.checkSensitiveWords(trimmedQuestion);
      if (matched) {
        throw new AppError(`输入内容包含敏感词汇【${matched}】，请重新表述你的困惑`, 400, 'SENSITIVE_WORD_DETECTED');
      }
    }

    // 2. 扣减能量
    const deduction = await UserService.deductEnergy(userId);

    // 3. 从数据库 78 张卡牌库中随机抽取一张
    const deck = await this.loadDeckFromDb();
    if (!deck.length) {
      throw new AppError('卡牌资源库初始化异常', 500, 'CARD_DECK_EMPTY');
    }

    const randomIndex = Math.floor(Math.random() * deck.length);
    const selectedCard = deck[randomIndex];

    // 4. 正逆位随机判定 (正位 75%, 逆位 25%)
    const isReversed = Math.random() < 0.25;
    const orientation = isReversed ? 'reversed' : 'upright';

    // 5. 插入抽牌记录（暂存能量扣减类型，若大模型推流异常自动依此退回）
    const reading = await prisma.tarotReading.create({
      data: {
        user_id: userId,
        card_id: selectedCard.index,
        card_name: selectedCard.nameCn,
        orientation,
        user_question: trimmedQuestion || null,
        reading_result: JSON.stringify({ energyType: deduction.energyType }),
        status: 'pending'
      }
    });

    return {
      readingId: reading.id,
      card: {
        index: selectedCard.index,
        nameCn: selectedCard.nameCn,
        nameEn: selectedCard.nameEn,
        slug: selectedCard.slug,
        category: selectedCard.category,
        categoryName: selectedCard.categoryName,
        roman: selectedCard.roman,
        tags: selectedCard.tags,
        quote: selectedCard.quote,
        // 多页面 OSS 资源图片统一对外输出
        image: selectedCard.image, // 首页 3D 抽牌缩略图 OSS 签名地址
        imageLarge: selectedCard.imageLarge, // 结果页与海报页高清大图 OSS 签名地址
        backImage: selectedCard.backImage, // 卡背 OSS 签名地址
        ossHomeKey: selectedCard.ossHomeKey,
        ossReadingKey: selectedCard.ossReadingKey,
        orientation,
        orientationName: isReversed ? '逆位' : '正位'
      },
      energyConsumed: deduction.energyType,
      remainingBonus: deduction.remainingBonus,
      createdAt: reading.created_at
    };
  }

  /**
   * 分页拉取历史抽牌记录
   */
  static async getHistory(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [total, items] = await prisma.$transaction([
      prisma.tarotReading.count({ where: { user_id: userId } }),
      prisma.tarotReading.findMany({
        where: { user_id: userId },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' }
      })
    ]);

    const deck = await this.loadDeckFromDb();
    const enriched = items.map((item) => {
      const cardMeta = deck.find((c) => c.index === item.card_id);
      return {
        id: item.id,
        cardId: item.card_id,
        cardName: item.card_name,
        orientation: item.orientation,
        userQuestion: item.user_question,
        readingResult: item.reading_result,
        status: item.status,
        createdAt: item.created_at,
        cardMeta: cardMeta
          ? {
              nameEn: cardMeta.nameEn,
              image: cardMeta.image,
              imageLarge: cardMeta.imageLarge,
              tags: cardMeta.tags,
              quote: cardMeta.quote
            }
          : null
      };
    });

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      items: enriched
    };
  }

  /**
   * 根据 ID 查询单条抽牌记录（供小程序端实时同步与兜底重查）
   */
  static async getReadingById(readingId: string, userId?: string) {
    const reading = await prisma.tarotReading.findUnique({
      where: { id: readingId }
    });
    if (!reading) {
      throw new AppError('解牌记录不存在', 404, 'READING_NOT_FOUND');
    }
    if (userId && reading.user_id !== userId) {
      throw new AppError('无权访问该解牌记录', 403, 'FORBIDDEN');
    }

    const card = this.getCardByIndex(reading.card_id);
    const isReversed = reading.orientation === 'reversed';

    return {
      id: reading.id,
      cardId: reading.card_id,
      cardName: reading.card_name,
      orientation: reading.orientation,
      orientationName: isReversed ? '逆位' : '正位',
      userQuestion: reading.user_question,
      readingResult: reading.reading_result,
      status: reading.status,
      createdAt: reading.created_at,
      card: card
        ? {
            index: card.index,
            slug: card.slug,
            nameCn: card.nameCn,
            nameEn: card.nameEn,
            category: card.category,
            categoryName: card.categoryName,
            element: card.element,
            roman: card.roman,
            tags: card.tags,
            quote: card.quote,
            image: card.image,
            imageLarge: card.imageLarge,
            backImage: card.backImage,
            orientation: reading.orientation,
            orientationName: isReversed ? '逆位' : '正位'
          }
        : null
    };
  }
}
