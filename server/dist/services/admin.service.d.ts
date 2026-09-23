import { Response } from 'express';
export declare class AdminService {
    /**
     * 管理员账号密码登录
     */
    static login(username: string, password: string): Promise<{
        token: string;
        admin: {
            id: string;
            username: string;
            role: string;
        };
    }>;
    /**
     * 运营仪表盘数据概览统计
     */
    static getDashboardStats(): Promise<{
        totalUsers: number;
        todayDau: number;
        todayDrawCount: number;
        todayInvitations: number;
        kFactor: number;
        estimatedTokens: number;
        estimatedCostRmb: number;
        serverTime: string;
    }>;
    /**
     * 用户列表查询与检索
     */
    static getUsers(page?: number, pageSize?: number, search?: string): Promise<{
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        items: {
            id: string;
            openid: string;
            bonusEnergy: number;
            lastFreeDate: string | null;
            isBlacklisted: boolean;
            readingsCount: number;
            invitationsCount: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    /**
     * 人工增扣用户能量
     */
    static adjustUserEnergy(userId: string, amount: number): Promise<{
        id: string;
        openid: string;
        bonus_energy: number;
        last_free_date: string | null;
        is_blacklisted: boolean;
        created_at: Date;
        updated_at: Date;
    }>;
    /**
     * 切换用户黑名单封禁状态
     */
    static toggleBlacklist(userId: string, isBlacklisted: boolean): Promise<{
        id: string;
        openid: string;
        bonus_energy: number;
        last_free_date: string | null;
        is_blacklisted: boolean;
        created_at: Date;
        updated_at: Date;
    }>;
    /**
     * 敏感词词库管理
     */
    static getSensitiveWords(): Promise<{
        id: number;
        created_at: Date;
        word: string;
        category: string;
    }[]>;
    static addSensitiveWord(word: string, category?: string): Promise<{
        id: number;
        created_at: Date;
        word: string;
        category: string;
    }>;
    static deleteSensitiveWord(id: number): Promise<{
        id: number;
        created_at: Date;
        word: string;
        category: string;
    }>;
    /**
     * 在线调试沙盒 SSE 流式推流
     */
    static sandboxStream(cardIndex: number, orientation: string, question: string, res: Response): Promise<void>;
}
