import axios from 'axios';
import { prisma } from '../models/prisma';
import { signUserToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { ENV } from '../config/constants';
import { getCSTTodayString } from '../utils/date';

export class AuthService {
  /**
   * 微信静默登录
   * @param code 微信客户端 wx.login 返回的临时授权码
   */
  static async wxLogin(code: string) {
    if (!code) {
      throw new AppError('微信登录凭证 code 不能为空', 400, 'PARAM_INVALID');
    }

    let openid = '';

    // 1. 若为开发者 Mock 模式或未配置微信 AppID，则走免微信服务端沙盒模式
    if (code.startsWith('mock_') || !ENV.WECHAT_APP_ID || !ENV.WECHAT_APP_SECRET) {
      openid = `mock_user_${code}`;
    } else {
      // 2. 真实请求微信官方接口换取 openid
      try {
        const wxUrl = 'https://api.weixin.qq.com/sns/jscode2session';
        const res = await axios.get(wxUrl, {
          params: {
            appid: ENV.WECHAT_APP_ID,
            secret: ENV.WECHAT_APP_SECRET,
            js_code: code,
            grant_type: 'authorization_code'
          },
          timeout: 5000
        });

        if (res.data.errcode && res.data.errcode !== 0) {
          throw new AppError(`微信登录失败: ${res.data.errmsg || '换取 openid 失败'}`, 400, 'WX_LOGIN_FAILED');
        }

        openid = res.data.openid;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError(`微信登录通信异常: ${err.message}`, 502, 'WX_NETWORK_ERROR');
      }
    }

    if (!openid) {
      throw new AppError('无法解析用户 OpenID', 500, 'OPENID_EMPTY');
    }

    // 3. 用户查询与注册
    let user = await prisma.user.findUnique({
      where: { openid }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid,
          bonus_energy: 0,
          last_free_date: null
        }
      });
    }

    if (user.is_blacklisted) {
      throw new AppError('该账号已被风控限制登录', 403, 'USER_BANNED');
    }

    // 4. 计算当前用户能量概况
    const today = getCSTTodayString();
    const hasFreeToday = user.last_free_date !== today;
    const totalAvailable = (hasFreeToday ? 1 : 0) + user.bonus_energy;

    // 5. 颁发用户 JWT
    const token = signUserToken({
      userId: user.id,
      openid: user.openid
    });

    return {
      token,
      user: {
        id: user.id,
        openid: user.openid,
        hasFreeToday,
        bonusEnergy: user.bonus_energy,
        totalAvailable,
        lastFreeDate: user.last_free_date
      }
    };
  }
}
