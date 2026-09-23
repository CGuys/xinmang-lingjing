"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TarotService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../models/prisma");
const error_middleware_1 = require("../middlewares/error.middleware");
const user_service_1 = require("./user.service");
// 载入权威 78 张卡牌数据集
const cardsFilePath = path_1.default.resolve(__dirname, '../data/cards.json');
let cardDeckCache = [];
function getCardDeck() {
    if (cardDeckCache.length > 0)
        return cardDeckCache;
    if (fs_1.default.existsSync(cardsFilePath)) {
        const raw = fs_1.default.readFileSync(cardsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        cardDeckCache = parsed.cards || [];
    }
    return cardDeckCache;
}
class TarotService {
    /**
     * 获取全部卡牌或按分类筛选
     */
    static getAllCards(category) {
        const deck = getCardDeck();
        if (!category || category === 'all')
            return deck;
        return deck.filter((c) => c.category === category);
    }
    /**
     * 获取单张卡牌详情
     */
    static getCardByIndex(index) {
        const deck = getCardDeck();
        return deck.find((c) => c.index === index);
    }
    /**
     * 检查文本是否包含反迷信违禁词
     */
    static async checkSensitiveWords(text) {
        if (!text)
            return null;
        const sensitiveWords = await prisma_1.prisma.sensitiveWord.findMany({
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
     * 抽牌操作
     */
    static async drawCard(userId, userQuestion) {
        const trimmedQuestion = (userQuestion || '').trim();
        // 1. 敏感词内容安全审查 (本地字典前置拦截)
        if (trimmedQuestion) {
            if (trimmedQuestion.length > 50) {
                throw new error_middleware_1.AppError('提问字数请控制在 50 字以内', 400, 'QUESTION_TOO_LONG');
            }
            const matched = await this.checkSensitiveWords(trimmedQuestion);
            if (matched) {
                throw new error_middleware_1.AppError(`输入内容包含敏感词汇【${matched}】，请重新表述你的困惑`, 400, 'SENSITIVE_WORD_DETECTED');
            }
        }
        // 2. 扣减能量（每日免费点优先，无免费点则扣减奖励点，全无则抛出 403）
        const deduction = await user_service_1.UserService.deductEnergy(userId);
        // 3. 从 78 张卡牌库中随机抽取一张
        const deck = getCardDeck();
        if (!deck.length) {
            throw new error_middleware_1.AppError('卡牌资源库初始化异常', 500, 'CARD_DECK_EMPTY');
        }
        const randomIndex = Math.floor(Math.random() * deck.length);
        const selectedCard = deck[randomIndex];
        // 4. 正逆位随机判定 (正位 75%, 逆位 25%)
        const isReversed = Math.random() < 0.25;
        const orientation = isReversed ? 'reversed' : 'upright';
        // 5. 插入抽牌记录
        const reading = await prisma_1.prisma.tarotReading.create({
            data: {
                user_id: userId,
                card_id: selectedCard.index,
                card_name: selectedCard.nameCn,
                orientation,
                user_question: trimmedQuestion || null,
                status: 'pending'
            }
        });
        return {
            readingId: reading.id,
            card: {
                index: selectedCard.index,
                nameCn: selectedCard.nameCn,
                nameEn: selectedCard.nameEn,
                category: selectedCard.category,
                categoryName: selectedCard.categoryName,
                roman: selectedCard.roman,
                tags: selectedCard.tags,
                image: selectedCard.image,
                quote: selectedCard.quote,
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
    static async getHistory(userId, page = 1, pageSize = 10) {
        const skip = (page - 1) * pageSize;
        const [total, items] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.tarotReading.count({ where: { user_id: userId } }),
            prisma_1.prisma.tarotReading.findMany({
                where: { user_id: userId },
                skip,
                take: pageSize,
                orderBy: { created_at: 'desc' }
            })
        ]);
        const deck = getCardDeck();
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
                cardMeta: cardMeta ? {
                    nameEn: cardMeta.nameEn,
                    image: cardMeta.image,
                    tags: cardMeta.tags,
                    quote: cardMeta.quote
                } : null
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
}
exports.TarotService = TarotService;
