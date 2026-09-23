interface TarotCard {
    index: number;
    name: string;
    nameCn: string;
    nameEn: string;
    category: string;
    categoryName: string;
    roman?: string;
    image: string;
    imageLarge?: string;
    element?: string;
    tags: string[];
    quote: string;
    insight: string;
    challenge: string;
    guidance: string;
    affirmation: string;
}
export declare class TarotService {
    /**
     * 获取全部卡牌或按分类筛选
     */
    static getAllCards(category?: string): TarotCard[];
    /**
     * 获取单张卡牌详情
     */
    static getCardByIndex(index: number): TarotCard | undefined;
    /**
     * 检查文本是否包含反迷信违禁词
     */
    static checkSensitiveWords(text: string): Promise<string | null>;
    /**
     * 抽牌操作
     */
    static drawCard(userId: string, userQuestion?: string): Promise<{
        readingId: string;
        card: {
            index: number;
            nameCn: string;
            nameEn: string;
            category: string;
            categoryName: string;
            roman: string | undefined;
            tags: string[];
            image: string;
            quote: string;
            orientation: string;
            orientationName: string;
        };
        energyConsumed: "free" | "bonus";
        remainingBonus: number;
        createdAt: Date;
    }>;
    /**
     * 分页拉取历史抽牌记录
     */
    static getHistory(userId: string, page?: number, pageSize?: number): Promise<{
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        items: {
            id: string;
            cardId: number;
            cardName: string;
            orientation: string;
            userQuestion: string | null;
            readingResult: string | null;
            status: string;
            createdAt: Date;
            cardMeta: {
                nameEn: string;
                image: string;
                tags: string[];
                quote: string;
            } | null;
        }[];
    }>;
}
export {};
