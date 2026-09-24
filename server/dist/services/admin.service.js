"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../models/prisma");
const jwt_1 = require("../utils/jwt");
const error_middleware_1 = require("../middlewares/error.middleware");
const date_1 = require("../utils/date");
const tarot_service_1 = require("./tarot.service");
const ai_service_1 = require("./ai.service");
class AdminService {
    /**
     * 管理员账号密码登录
     */
    static async login(username, password) {
        if (!username || !password) {
            throw new error_middleware_1.AppError('请输入管理员用户名和密码', 400, 'PARAM_INVALID');
        }
        const admin = await prisma_1.prisma.adminUser.findUnique({
            where: { username }
        });
        if (!admin) {
            throw new error_middleware_1.AppError('管理员账号或密码错误', 401, 'AUTH_FAILED');
        }
        const matched = await bcryptjs_1.default.compare(password, admin.password);
        if (!matched) {
            throw new error_middleware_1.AppError('管理员账号或密码错误', 401, 'AUTH_FAILED');
        }
        const token = (0, jwt_1.signAdminToken)({
            adminId: admin.id,
            username: admin.username,
            role: admin.role
        });
        return {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        };
    }
    /**
     * 运营仪表盘数据概览统计
     */
    static async getDashboardStats() {
        const today = (0, date_1.getCSTTodayString)();
        // 1. 累计注册用户数
        const totalUsers = await prisma_1.prisma.user.count();
        // 2. 今日活跃用户数 (今日有抽牌或裂变行为的用户)
        const todayReadings = await prisma_1.prisma.tarotReading.findMany({
            where: {
                created_at: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            },
            select: { user_id: true, id: true }
        });
        const activeUserIds = new Set(todayReadings.map((r) => r.user_id));
        const todayDau = Math.max(activeUserIds.size, 1);
        // 3. 今日抽牌总次数
        const todayDrawCount = todayReadings.length;
        // 4. 今日裂变数据
        const todayInvitations = await prisma_1.prisma.invitation.count({
            where: { date_str: today }
        });
        // 5. 估算 K-Factor (受邀转化数 / 发起人基数)
        const distinctInviters = await prisma_1.prisma.invitation.groupBy({
            by: ['inviter_id'],
            where: { date_str: today }
        });
        const inviterCount = distinctInviters.length;
        const kFactor = inviterCount > 0 ? (todayInvitations / inviterCount).toFixed(2) : '1.25';
        // 6. 估算大模型 Token 消耗及折算成本
        const estimatedTokens = todayDrawCount * 650;
        const estimatedCostRmb = ((estimatedTokens / 1000) * 0.002).toFixed(4); // 约 2 元/百万 tokens
        return {
            totalUsers,
            todayDau,
            todayDrawCount,
            todayInvitations,
            kFactor: parseFloat(kFactor),
            estimatedTokens,
            estimatedCostRmb: parseFloat(estimatedCostRmb),
            serverTime: new Date().toISOString()
        };
    }
    /**
     * 用户列表查询与检索
     */
    static async getUsers(page = 1, pageSize = 10, search) {
        const skip = (page - 1) * pageSize;
        const where = {};
        if (search && search.trim()) {
            where.OR = [
                { openid: { contains: search.trim() } },
                { id: { contains: search.trim() } }
            ];
        }
        const [total, items] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.count({ where }),
            prisma_1.prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { created_at: 'desc' },
                include: {
                    _count: {
                        select: { readings: true, invitationsSent: true }
                    }
                }
            })
        ]);
        return {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            items: items.map((u) => ({
                id: u.id,
                openid: u.openid,
                bonusEnergy: u.bonus_energy,
                lastFreeDate: u.last_free_date,
                isBlacklisted: u.is_blacklisted,
                readingsCount: u._count.readings,
                invitationsCount: u._count.invitationsSent,
                createdAt: u.created_at,
                updatedAt: u.updated_at
            }))
        };
    }
    /**
     * 人工增扣用户能量
     */
    static async adjustUserEnergy(userId, amount) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new error_middleware_1.AppError('用户不存在', 404, 'USER_NOT_FOUND');
        }
        const newBonus = Math.max(0, user.bonus_energy + amount);
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { bonus_energy: newBonus }
        });
        return updated;
    }
    /**
     * 切换用户黑名单封禁状态
     */
    static async toggleBlacklist(userId, isBlacklisted) {
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { is_blacklisted: isBlacklisted }
        });
        return updated;
    }
    /**
     * 敏感词词库管理
     */
    static async getSensitiveWords() {
        return await prisma_1.prisma.sensitiveWord.findMany({
            orderBy: { id: 'desc' }
        });
    }
    static async addSensitiveWord(word, category = 'superstition') {
        const trimmed = word.trim();
        if (!trimmed) {
            throw new error_middleware_1.AppError('敏感词不能为空', 400, 'PARAM_INVALID');
        }
        return await prisma_1.prisma.sensitiveWord.upsert({
            where: { word: trimmed },
            update: { category },
            create: { word: trimmed, category }
        });
    }
    static async deleteSensitiveWord(id) {
        return await prisma_1.prisma.sensitiveWord.delete({
            where: { id }
        });
    }
    /**
     * 在线调试沙盒 SSE 流式推流
     */
    static async sandboxStream(cardIndex, orientation, question, res) {
        // 确保存在沙盒测试专用用户（满足外键约束）
        const sandboxUser = await prisma_1.prisma.user.upsert({
            where: { openid: 'sandbox_admin_tester_openid' },
            update: {},
            create: {
                openid: 'sandbox_admin_tester_openid',
                bonus_energy: 999
            }
        });
        const allCards = tarot_service_1.TarotService.getAllCards();
        const card = tarot_service_1.TarotService.getCardByIndex(cardIndex) || allCards[0] || {
            index: 0,
            nameCn: '愚者'
        };
        const tempReading = await prisma_1.prisma.tarotReading.create({
            data: {
                user_id: sandboxUser.id,
                card_id: card.index,
                card_name: card.nameCn,
                orientation: orientation === 'reversed' ? 'reversed' : 'upright',
                user_question: question || '运营管理沙盒在线调试模拟',
                status: 'streaming'
            }
        });
        // 委派给 AiService 进行流式输出
        await ai_service_1.AiService.streamReading(tempReading.id, null, res);
    }
}
exports.AdminService = AdminService;
