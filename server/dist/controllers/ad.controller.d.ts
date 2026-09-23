import { Request, Response, NextFunction } from 'express';
export declare class AdController {
    /**
     * 微信激励视频服务端回调
     * 接收标准参数：trans_id, user_id, reward_time, sign
     */
    static rewardCallback(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
