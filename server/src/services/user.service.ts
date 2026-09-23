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
    const dailyFreeLimit = Number(strategy.daily_free_limit) || 1;

    // 懒加载判断：如果上次使用免费能量不是今天，则今天拥有免费点
    const hasFreeToday = user.last_free_date !== today;
    const freeCount = hasFreeToday ? dailyFreeLimit : 0;
    const totalAvailable = freeCount + user.bonus_energy;

    return {
      userId: user.id,
      openid: user.openid,
      hasFreeToday,
      freeEnergyAvailable: freeCount,
      bonusEnergy: user.bonus_energy,
      totalAvailable,
      lastFreeDate: user.last_free_date,
      isBlacklisted: user.is_blacklisted,
      createdAt: user.created_at
    };
  }

  /**
   * 抽牌前能量核销
   * 扣减优先级：
   * 1. 若 last_free_date != today，优先扣减免费点，更新 last_free_date = today
   * 2. 若已用完免费点且 bonus_energy > 0，扣减 bonus_energy = bonus_energy - 1
   * 3. 否则拦截并抛出 403 错误
   */
  static async deductEnergy(userId: string): Promise<{ energyType: 'free' | 'bonus'; remainingBonus: number }> {
    const today = getCSTTodayString();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    if (user.is_blacklisted) {
      throw new AppError('账号处于风控受限状态', 403, 'USER_BANNED');
    }

    // 优先消耗今日免费点
    if (user.last_free_date !== today) {
      await prisma.user.update({
        where: { id: userId },
        data: { last_free_date: today }
      });
      return { energyType: 'free', remainingBonus: user.bonus_energy };
    }

    // 次选消耗奖励点数
    if (user.bonus_energy > 0) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { bonus_energy: { decrement: 1 } }
      });
      return { energyType: 'bonus', remainingBonus: updated.bonus_energy };
    }

    // 均无能量，拦截
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
}
