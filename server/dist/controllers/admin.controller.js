"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
const config_service_1 = require("../services/config.service");
const tarot_service_1 = require("../services/tarot.service");
class AdminController {
    static async login(req, res, next) {
        try {
            const { username, password } = req.body;
            const result = await admin_service_1.AdminService.login(username, password);
            res.json({
                code: 'SUCCESS',
                message: '管理员登录成功',
                data: result
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDashboard(req, res, next) {
        try {
            const stats = await admin_service_1.AdminService.getDashboardStats();
            res.json({
                code: 'SUCCESS',
                message: '获取数据概览成功',
                data: stats
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getStrategy(req, res, next) {
        try {
            const config = await config_service_1.ConfigService.getStrategyConfig();
            res.json({
                code: 'SUCCESS',
                message: '获取策略配置成功',
                data: config
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStrategy(req, res, next) {
        try {
            const updated = await config_service_1.ConfigService.updateStrategyConfig(req.body);
            res.json({
                code: 'SUCCESS',
                message: '业务策略更新成功，已即时生效',
                data: updated
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAiConfig(req, res, next) {
        try {
            const config = await config_service_1.ConfigService.getAiConfig();
            res.json({
                code: 'SUCCESS',
                message: '获取 AI 配置成功',
                data: config
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateAiConfig(req, res, next) {
        try {
            const updated = await config_service_1.ConfigService.updateAiConfig(req.body);
            res.json({
                code: 'SUCCESS',
                message: 'AI 编排配置已保存',
                data: updated
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCards(req, res, next) {
        try {
            const { category, search } = req.query;
            let cards = tarot_service_1.TarotService.getAllCards(category);
            if (search && typeof search === 'string' && search.trim()) {
                const q = search.trim().toLowerCase();
                cards = cards.filter((c) => c.nameCn.toLowerCase().includes(q) ||
                    c.nameEn.toLowerCase().includes(q) ||
                    c.tags.some((t) => t.toLowerCase().includes(q)));
            }
            res.json({
                code: 'SUCCESS',
                message: '获取卡牌档案成功',
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
    static async getSensitiveWords(req, res, next) {
        try {
            const words = await admin_service_1.AdminService.getSensitiveWords();
            res.json({
                code: 'SUCCESS',
                message: '获取违禁词库成功',
                data: words
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async addSensitiveWord(req, res, next) {
        try {
            const { word, category } = req.body;
            const created = await admin_service_1.AdminService.addSensitiveWord(word, category);
            res.json({
                code: 'SUCCESS',
                message: '添加违禁词成功',
                data: created
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteSensitiveWord(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            await admin_service_1.AdminService.deleteSensitiveWord(id);
            res.json({
                code: 'SUCCESS',
                message: '删除违禁词成功',
                data: null
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const pageSize = parseInt(req.query.pageSize, 10) || 10;
            const search = req.query.search;
            const result = await admin_service_1.AdminService.getUsers(page, pageSize, search);
            res.json({
                code: 'SUCCESS',
                message: '获取用户列表成功',
                data: result
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async adjustUserEnergy(req, res, next) {
        try {
            const { userId } = req.params;
            const { amount } = req.body;
            const user = await admin_service_1.AdminService.adjustUserEnergy(userId, parseInt(amount, 10) || 0);
            res.json({
                code: 'SUCCESS',
                message: '调整用户能量成功',
                data: user
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async toggleBlacklist(req, res, next) {
        try {
            const { userId } = req.params;
            const { isBlacklisted } = req.body;
            const user = await admin_service_1.AdminService.toggleBlacklist(userId, Boolean(isBlacklisted));
            res.json({
                code: 'SUCCESS',
                message: isBlacklisted ? '用户已加入封禁黑名单' : '用户已解除封禁',
                data: user
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async sandboxStream(req, res, next) {
        try {
            const cardIndex = parseInt(req.query.card_index, 10) || 0;
            const orientation = req.query.orientation || 'upright';
            const question = req.query.question || '';
            await admin_service_1.AdminService.sandboxStream(cardIndex, orientation, question, res);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AdminController = AdminController;
