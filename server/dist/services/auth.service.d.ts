export declare class AuthService {
    /**
     * 微信静默登录
     * @param code 微信客户端 wx.login 返回的临时授权码
     */
    static wxLogin(code: string): Promise<{
        token: string;
        user: {
            id: string;
            openid: string;
            hasFreeToday: boolean;
            bonusEnergy: number;
            totalAvailable: number;
            lastFreeDate: string | null;
        };
    }>;
}
