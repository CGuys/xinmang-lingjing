export declare class UserService {
    /**
     * 获取用户当前个人资料与能量资产详情
     */
    static getProfile(userId: string): Promise<{
        userId: string;
        openid: string;
        hasFreeToday: boolean;
        freeEnergyAvailable: number;
        bonusEnergy: number;
        totalAvailable: number;
        lastFreeDate: string | null;
        isBlacklisted: boolean;
        createdAt: Date;
    }>;
    /**
     * 抽牌前能量核销
     * 扣减优先级：
     * 1. 若 last_free_date != today，优先扣减免费点，更新 last_free_date = today
     * 2. 若已用完免费点且 bonus_energy > 0，扣减 bonus_energy = bonus_energy - 1
     * 3. 否则拦截并抛出 403 错误
     */
    static deductEnergy(userId: string): Promise<{
        energyType: 'free' | 'bonus';
        remainingBonus: number;
    }>;
    /**
     * 增加奖励点数 (裂变或广告观看完播奖励)
     */
    static addBonusEnergy(userId: string, amount?: number): Promise<{
        id: string;
        openid: string;
        bonus_energy: number;
        last_free_date: string | null;
        is_blacklisted: boolean;
        created_at: Date;
        updated_at: Date;
    }>;
}
