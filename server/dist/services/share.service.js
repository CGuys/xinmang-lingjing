"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareService = void 0;
const prisma_1 = require("../models/prisma");
const cache_1 = require("../utils/cache");
const error_middleware_1 = require("../middlewares/error.middleware");
const date_1 = require("../utils/date");
const config_service_1 = require("./config.service");
class ShareService {
    /**
     * 受邀用户进入小程序并上报裂变互惠关系
     * @param inviteeId 当前受邀新/老用户 ID
     * @param inviterId 邀请人用户 ID
     */
    static async acceptShare(inviteeId, inviterId) {
        if (!inviterId) {
            throw new error_middleware_1.AppError('邀请人标识 inviter_id 缺失', 400, 'PARAM_INVALID');
        }
        // 1. 防作弊校验：禁止自己点击自己生成的裂变分享
        if (inviteeId === inviterId) {
            throw new error_middleware_1.AppError('不能通过自己分享的链接为自己充能', 400, 'CANNOT_INVITE_SELF');
        }
        // 2. 校验邀请人是否存在
        const inviter = await prisma_1.prisma.user.findUnique({
            where: { id: inviterId }
        });
        if (!inviter) {
            throw new error_middleware_1.AppError('邀请人不存在或已失效', 404, 'INVITER_NOT_FOUND');
        }
        // 3. 检查全局业务策略开关
        const strategy = await config_service_1.ConfigService.getStrategyConfig();
        if (!strategy.share_reward_enabled) {
            return {
                rewarded: false,
                message: '当前分享奖励通道未开启',
                inviterBonusEnergy: inviter.bonus_energy
            };
        }
        const today = (0, date_1.getCSTTodayString)();
        const shareLimit = Number(strategy.share_reward_limit) || 3;
        // 4. 单日上限控制：检查 Redis/内存缓存计数值
        const cacheKey = `share_reward:${inviterId}:${today}`;
        const currentRewardedCount = await cache_1.cache.get(cacheKey);
        const countNum = currentRewardedCount ? parseInt(currentRewardedCount, 10) : 0;
        if (countNum >= shareLimit) {
            return {
                rewarded: false,
                message: '好友今日获赠能量已达上限',
                inviterBonusEnergy: inviter.bonus_energy
            };
        }
        // 5. 数据库三元唯一索引检查 (inviter_id, invitee_id, date_str)，杜绝好友同日反复进出重复加点
        const existing = await prisma_1.prisma.invitation.findUnique({
            where: {
                inviter_id_invitee_id_date_str: {
                    inviter_id: inviterId,
                    invitee_id: inviteeId,
                    date_str: today
                }
            }
        });
        if (existing) {
            return {
                rewarded: false,
                message: '今日已为该好友注入过能量，不可重复互助',
                inviterBonusEnergy: inviter.bonus_energy
            };
        }
        // 6. 开启事务：记录裂变流水并为邀请人补能
        const [invitationRecord, updatedInviter] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.invitation.create({
                data: {
                    inviter_id: inviterId,
                    invitee_id: inviteeId,
                    date_str: today
                }
            }),
            prisma_1.prisma.user.update({
                where: { id: inviterId },
                data: {
                    bonus_energy: { increment: 1 }
                }
            })
        ]);
        // 7. 更新缓存计数器（设置今日 24 点过期）
        const ttl = (0, date_1.getSecondsUntilMidnight)();
        await cache_1.cache.incr(cacheKey, ttl);
        return {
            rewarded: true,
            message: '共鸣成功！已为好友注入 1 点灵感能量',
            invitationId: invitationRecord.id,
            inviterBonusEnergy: updatedInviter.bonus_energy
        };
    }
}
exports.ShareService = ShareService;
