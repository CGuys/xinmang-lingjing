import { Request, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { cache } from '../utils/cache';
import { UserService } from '../services/user.service';
import { ConfigService } from './../services/config.service';

export class AdController {
  /**
   * 微信激励视频服务端回调
   * 接收标准参数：trans_id, user_id, reward_time, sign
   */
  static async rewardCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { trans_id, user_id } = req.body;

      if (!trans_id || !user_id) {
        return res.status(400).json({ errcode: 400, errmsg: '缺少必要参数' });
      }

      // 检查广告开关
      const strategy = await ConfigService.getStrategyConfig();
      if (!strategy.ad_reward_enabled) {
        return res.status(403).json({ errcode: 403, errmsg: '广告奖励通道暂未开启' });
      }

      // 幂等性校验：同一 trans_id 不得重复充值
      const idempotencyKey = `ad_trans:${trans_id}`;
      const existing = await cache.get(idempotencyKey);
      if (existing) {
        return res.json({ errcode: 0, errmsg: 'OK (Duplicate idempotent ignored)' });
      }

      const user = await prisma.user.findUnique({
        where: { id: user_id }
      });

      if (!user) {
        return res.status(404).json({ errcode: 404, errmsg: '用户不存在' });
      }

      // 增加 1 点奖励能量
      await UserService.addBonusEnergy(user_id, 1);

      // 缓存 48 小时防止重复消费同一个 transaction_id
      await cache.set(idempotencyKey, '1', 172800);

      res.json({
        errcode: 0,
        errmsg: 'OK',
        data: {
          rewarded: true,
          bonus_energy: user.bonus_energy + 1
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
