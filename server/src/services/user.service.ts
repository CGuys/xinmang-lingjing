import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/error.middleware';
import { getCSTTodayString } from '../utils/date';
import { ConfigService } from './config.service';

export class UserService {
  /**
   * 获取用户当前个人资料与能量资产详情
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    const today = getCSTTodayString();
    const strategy = await ConfigService.getStrategyConfig();
    const dailyFreeLimit = Number(strategy.daily_free_limit) ?? 1;

    // 懒加载判断：如果上次使用免费能量不是今天，则已消耗为 0
    const isToday = user.last_free_date === today;
    const freeEnergyUsedToday = isToday ? Math.min(user.free_used_today || 0, dailyFreeLimit) : 0;
    const freeEnergyAvailable = Math.max(0, dailyFreeLimit - freeEnergyUsedToday);
    const hasFreeToday = freeEnergyAvailable > 0;
    const totalAvailable = freeEnergyAvailable + user.bonus_energy;

    return {
      userId: user.id,
      openid: user.openid,
      dailyFreeLimit,
      freeEnergyUsedToday,
      freeEnergyAvailable,
      bonusEnergy: user.bonus_energy,
      totalAvailable,
      hasFreeToday,
      lastFreeDate: user.last_free_date,
      isBlacklisted: user.is_blacklisted,
      createdAt: user.created_at
    };
  }

  /**
   * 抽牌前能量核销
   * 扣减优先级：
   * 1. 优先扣减今日免费点（根据后台配置的 dailyFreeLimit 进行逐次核销，记录 free_used_today）
   * 2. 若今日免费点已用满且 bonus_energy > 0，扣减 bonus_energy = bonus_energy - 1
   * 3. 否则拦截并抛出 403 错误
   */
  static async deductEnergy(userId: string): Promise<{ energyType: 'free' | 'bonus'; remainingBonus: number }> {
    const today = getCSTTodayString();
    const strategy = await ConfigService.getStrategyConfig();
    const dailyFreeLimit = Number(strategy.daily_free_limit) ?? 1;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    if (user.is_blacklisted) {
      throw new AppError('账号处于风控受限状态', 403, 'USER_BANNED');
    }

    // 1. 如果是新的一天，重置已使用数为 1
    if (user.last_free_date !== today) {
      if (dailyFreeLimit > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            last_free_date: today,
            free_used_today: 1
          }
        });
        return { energyType: 'free', remainingBonus: user.bonus_energy };
      }
    } else {
      // 2. 如果今天已经是 today，但已消耗数尚未达到 dailyFreeLimit
      const currentUsed = user.free_used_today || 0;
      if (currentUsed < dailyFreeLimit) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            free_used_today: currentUsed + 1
          }
        });
        return { energyType: 'free', remainingBonus: user.bonus_energy };
      }
    }

    // 3. 次选消耗奖励点数
    if (user.bonus_energy > 0) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { bonus_energy: { decrement: 1 } }
      });
      return { energyType: 'bonus', remainingBonus: updated.bonus_energy };
    }

    // 4. 均无能量，拦截
    throw new AppError('今日灵感已消耗完毕，邀请好友或观看短片即可补充灵感点', 403, 'ENERGY_EXHAUSTED');
  }

  /**
   * 增加奖励点数 (裂变或广告观看完播奖励)
   */
  static async addBonusEnergy(userId: string, amount = 1) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { bonus_energy: { increment: amount } }
    });
    return updated;
  }

  /**
   * 返还用户消耗的能量（大模型生成失败或中断时的安全回滚，确保未成功不消耗次数）
   */
  static async refundEnergy(userId: string, energyType?: string) {
    try {
      if (energyType === 'bonus') {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { bonus_energy: { increment: 1 } }
        });
        return { energyType: 'bonus', remainingBonus: updated.bonus_energy };
      } else {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && (user.free_used_today || 0) > 0) {
          const updated = await prisma.user.update({
            where: { id: userId },
            data: { free_used_today: Math.max(0, user.free_used_today - 1) }
          });
          return { energyType: 'free', freeUsedToday: updated.free_used_today };
        }
      }
    } catch (err: any) {
      console.warn('[UserService.refundEnergy error]', err.message);
    }
  }
}

