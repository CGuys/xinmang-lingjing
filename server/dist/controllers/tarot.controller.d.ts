import { Request, Response, NextFunction } from 'express';
export declare class TarotController {
    /**
     * 发起抽牌并扣减能量
     */
    static drawCard(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * SSE 流式返回大模型心理投射解读内容
     */
    static streamReading(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * 获取用户历史抽牌记录
     */
    static getHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * 获取卡牌库全量列表（小程序可用于卡牌图鉴展示）
     */
    static getCards(req: Request, res: Response, next: NextFunction): Promise<void>;
}
