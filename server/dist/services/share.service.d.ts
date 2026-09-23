export declare class ShareService {
    /**
     * 受邀用户进入小程序并上报裂变互惠关系
     * @param inviteeId 当前受邀新/老用户 ID
     * @param inviterId 邀请人用户 ID
     */
    static acceptShare(inviteeId: string, inviterId: string): Promise<{
        rewarded: boolean;
        message: string;
        inviterBonusEnergy: number;
        invitationId?: undefined;
    } | {
        rewarded: boolean;
        message: string;
        invitationId: string;
        inviterBonusEnergy: number;
    }>;
}
