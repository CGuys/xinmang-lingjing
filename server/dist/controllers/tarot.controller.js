"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TarotController = void 0;
const tarot_service_1 = require("../services/tarot.service");
const ai_service_1 = require("../services/ai.service");
const error_middleware_1 = require("../middlewares/error.middleware");
class TarotController {
    /**
     * 发起抽牌并扣减能量
     */
    static async drawCard(req, res, next) {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('未授权访问', 401, 'UNAUTHORIZED');
            }
            const { question } = req.body;
            const result = await tarot_service_1.TarotService.drawCard(req.user.id, question);
            res.json({
                code: 'SUCCESS',
                message: '抽牌成功',
                data: result
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * SSE 流式返回大模型心理投射解读内容
     */
    static async streamReading(req, res, next) {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('未授权访问', 401, 'UNAUTHORIZED');
            }
            const { reading_id } = req.params;
            await ai_service_1.AiService.streamReading(reading_id, req.user.id, res);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * 获取用户历史抽牌记录
     */
    static async getHistory(req, res, next) {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('未授权访问', 401, 'UNAUTHORIZED');
            }
            const page = parseInt(req.query.page, 10) || 1;
            const pageSize = parseInt(req.query.pageSize, 10) || 10;
            const history = await tarot_service_1.TarotService.getHistory(req.user.id, page, pageSize);
            res.json({
                code: 'SUCCESS',
                message: '获取历史记录成功',
                data: history
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * 获取卡牌库全量列表（小程序可用于卡牌图鉴展示）
     */
    static async getCards(req, res, next) {
        try {
            const category = req.query.category;
            const cards = tarot_service_1.TarotService.getAllCards(category);
            res.json({
                code: 'SUCCESS',
                message: '获取卡牌库成功',
                data: {
                    total: cards.length,
                    cards
                }
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TarotController = TarotController;
