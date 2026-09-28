import QRCode from 'qrcode';
import axios from 'axios';
import { prisma } from '../models/prisma';
import { cache } from '../utils/cache';
import { AppError } from '../middlewares/error.middleware';
import { getCSTTodayString, getSecondsUntilMidnight } from '../utils/date';
import { ConfigService } from './config.service';
import { ENV } from '../config/constants';

export class ShareService {
  /**
   * 获取或生成小程序码 / 二维码 Buffer
   * @param inviterId 邀请人 ID
   */
  static async getQrcodeBuffer(inviterId?: string): Promise<{ buffer: Buffer; contentType: string }> {
    // 1. 若配置了微信官方开发凭证，尝试向微信开放平台换取菊花码
    if (ENV.WECHAT_APP_ID && ENV.WECHAT_APP_SECRET) {
      try {
        const tokenRes = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
          params: {
            grant_type: 'client_credential',
            appid: ENV.WECHAT_APP_ID,
            secret: ENV.WECHAT_APP_SECRET
          },
          timeout: 5000
        });

        if (tokenRes.data && tokenRes.data.access_token) {
          const accessToken = tokenRes.data.access_token;
          const codeRes = await axios.post(
            `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
            {
              scene: inviterId ? `uid=${inviterId}` : 'default',
              page: 'pages/index/index',
              check_path: false,
              width: 430
            },
            {
              responseType: 'arraybuffer',
              timeout: 6000
            }
          );

          const contentType = String(codeRes.headers['content-type'] || '');
          if (contentType.includes('image')) {
            return {
              buffer: Buffer.from(codeRes.data),
              contentType: contentType || 'image/jpeg'
            };
          }
        }
      } catch (e: any) {
        console.warn('[WeChat QR Code] 微信官方接口调用失败，自动降级为内置高清二维码', e?.message);
      }
    }

    // 2. 降级模式：使用 qrcode 模块生成高清二维码
    const payload = inviterId
      ? `https://mp.weixin.qq.com/wxopen/wareadcode?inviter_id=${inviterId}&page=pages/index/index`
      : 'https://mp.weixin.qq.com/wxopen/wareadcode?page=pages/index/index';

    const buffer = await QRCode.toBuffer(payload, {
      width: 400,
      margin: 1,
      color: {
        dark: '#0f0d22',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });

    return {
      buffer,
      contentType: 'image/png'
    };
  }

  /**
   * 受邀用户进入小程序并上报裂变互惠关系
   * @param inviteeId 当前受邀新/老用户 ID
   * @param inviterId 邀请人用户 ID
   */
  static async acceptShare(inviteeId: string, inviterId: string) {
    if (!inviterId) {
      throw new AppError('邀请人标识 inviter_id 缺失', 400, 'PARAM_INVALID');
    }

    // 1. 防作弊校验：禁止自己点击自己生成的裂变分享
    if (inviteeId === inviterId) {
      throw new AppError('不能通过自己分享的链接为自己充能', 400, 'CANNOT_INVITE_SELF');
    }

    // 2. 校验邀请人是否存在
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId }
    });

    if (!inviter) {
      throw new AppError('邀请人不存在或已失效', 404, 'INVITER_NOT_FOUND');
    }

    // 3. 检查全局业务策略开关
    const strategy = await ConfigService.getStrategyConfig();
    if (!strategy.share_reward_enabled) {
      return {
        rewarded: false,
        message: '当前分享奖励通道未开启',
        inviterBonusEnergy: inviter.bonus_energy
      };
    }

    const today = getCSTTodayString();
    const shareLimit = Number(strategy.share_reward_limit) || 3;

    // 4. 单日上限控制：检查 Redis/内存缓存计数值
    const cacheKey = `share_reward:${inviterId}:${today}`;
    const currentRewardedCount = await cache.get(cacheKey);
    const countNum = currentRewardedCount ? parseInt(currentRewardedCount, 10) : 0;

    if (countNum >= shareLimit) {
      return {
        rewarded: false,
        message: '好友今日获赠能量已达上限',
        inviterBonusEnergy: inviter.bonus_energy
      };
    }

    // 5. 数据库三元唯一索引检查 (inviter_id, invitee_id, date_str)，杜绝好友同日反复进出重复加点
    const existing = await prisma.invitation.findUnique({
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
    const [invitationRecord, updatedInviter] = await prisma.$transaction([
      prisma.invitation.create({
        data: {
          inviter_id: inviterId,
          invitee_id: inviteeId,
          date_str: today
        }
      }),
      prisma.user.update({
        where: { id: inviterId },
        data: {
          bonus_energy: { increment: 1 }
        }
      })
    ]);

    // 7. 更新缓存计数器（设置今日 24 点过期）
    const ttl = getSecondsUntilMidnight();
    await cache.incr(cacheKey, ttl);

    return {
      rewarded: true,
      message: '共鸣成功！已为好友注入 1 点灵感能量',
      invitationId: invitationRecord.id,
      inviterBonusEnergy: updatedInviter.bonus_energy
    };
  }
}
