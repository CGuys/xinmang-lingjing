import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { prisma } from '../models/prisma';
import { signAdminToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';
import { getCSTTodayString } from '../utils/date';
import { ConfigService } from './config.service';
import { TarotService } from './tarot.service';
import { AiService } from './ai.service';

export class AdminService {
  /**
   * 管理员账号密码登录
   */
  static async login(username: string, password: string) {
    if (!username || !password) {
      throw new AppError('请输入管理员用户名和密码', 400, 'PARAM_INVALID');
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username }
    });

    if (!admin) {
      throw new AppError('管理员账号或密码错误', 401, 'AUTH_FAILED');
    }

    const matched = await bcrypt.compare(password, admin.password);
    if (!matched) {
      throw new AppError('管理员账号或密码错误', 401, 'AUTH_FAILED');
    }

    const token = signAdminToken({
      adminId: admin.id,
      username: admin.username,
      role: admin.role
    });

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    };
  }

  /**
   * 运营仪表盘数据概览统计
   */
  static async getDashboardStats() {
    const today = getCSTTodayString();

    // 1. 累计注册用户数
    const totalUsers = await prisma.user.count();

    // 2. 今日活跃用户数 (今日有真实抽牌行为的用户)
    const todayReadings = await prisma.tarotReading.findMany({
      where: {
        created_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      select: { user_id: true, id: true }
    });

    const activeUserIds = new Set(todayReadings.map((r) => r.user_id));
    const todayDau = activeUserIds.size;

    // 3. 今日抽牌总次数
    const todayDrawCount = todayReadings.length;

    // 4. 今日裂变数据
    const todayInvitations = await prisma.invitation.count({
      where: { date_str: today }
    });

    // 5. 真实 K-Factor (受邀转化数 / 发起人基数)
    const distinctInviters = await prisma.invitation.groupBy({
      by: ['inviter_id'],
      where: { date_str: today }
    });
    const inviterCount = distinctInviters.length;
    const kFactor = inviterCount > 0 ? (todayInvitations / inviterCount).toFixed(2) : '0.00';

    // 6. 估算大模型 Token 消耗及折算成本
    const estimatedTokens = todayDrawCount * 650;
    const estimatedCostRmb = ((estimatedTokens / 1000) * 0.002).toFixed(4);

    // 7. 真实实时流水日志 (最新 8 条真实抽牌记录)
    const recentReadings = await prisma.tarotReading.findMany({
      take: 8,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { openid: true } }
      }
    });

    const activityLogs = recentReadings.map((r) => {
      const isFree = !r.reading_result || !r.reading_result.includes('"bonus"');
      const timeDiffMs = Date.now() - new Date(r.created_at).getTime();
      const minutesAgo = Math.floor(timeDiffMs / 60000);
      const timeStr = minutesAgo <= 1 ? '刚刚' : `${minutesAgo} 分钟前`;
      return {
        userId: r.user?.openid ? r.user.openid.slice(-6) : r.user_id.slice(-6),
        cardName: r.card_name,
        orientation: r.orientation === 'reversed' ? '逆位' : '正位',
        theme: r.user_question || '潜意识探索 · 身心观照',
        isFree,
        status: r.status,
        time: timeStr
      };
    });

    // 8. 真实 15 天新增与抽牌趋势
    const trendDates: string[] = [];
    const trendDau: number[] = [];
    const trendDraws: number[] = [];

    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(new Date(d).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(d).setHours(23, 59, 59, 999));
      trendDates.push(`${startOfDay.getMonth() + 1}/${startOfDay.getDate()}`);

      const dayReadings = await prisma.tarotReading.findMany({
        where: {
          created_at: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: { user_id: true }
      });

      trendDraws.push(dayReadings.length);
      trendDau.push(new Set(dayReadings.map((r) => r.user_id)).size);
    }

    return {
      totalUsers,
      todayDau,
      todayDrawCount,
      todayInvitations,
      kFactor: parseFloat(kFactor),
      estimatedTokens,
      estimatedCostRmb: parseFloat(estimatedCostRmb),
      activityLogs,
      trend: {
        dates: trendDates,
        dau: trendDau,
        draws: trendDraws
      },
      serverTime: new Date().toISOString()
    };
  }


  /**
   * 用户列表查询与检索
   */
  static async getUsers(page = 1, pageSize = 10, search?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (search && search.trim()) {
      where.OR = [
        { openid: { contains: search.trim() } },
        { id: { contains: search.trim() } }
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { readings: true, invitationsSent: true }
          }
        }
      })
    ]);

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      items: items.map((u) => ({
        id: u.id,
        openid: u.openid,
        bonusEnergy: u.bonus_energy,
        lastFreeDate: u.last_free_date,
        isBlacklisted: u.is_blacklisted,
        readingsCount: u._count.readings,
        invitationsCount: u._count.invitationsSent,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    };
  }

  /**
   * 人工增扣用户能量
   */
  static async adjustUserEnergy(userId: string, amount: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    const newBonus = Math.max(0, user.bonus_energy + amount);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { bonus_energy: newBonus }
    });

    return updated;
  }

  /**
   * 切换用户黑名单封禁状态
   */
  static async toggleBlacklist(userId: string, isBlacklisted: boolean) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { is_blacklisted: isBlacklisted }
    });
    return updated;
  }

  /**
   * 敏感词词库管理
   */
  static async getSensitiveWords() {
    return await prisma.sensitiveWord.findMany({
      orderBy: { id: 'desc' }
    });
  }

  static async addSensitiveWord(word: string, category = 'superstition') {
    const trimmed = word.trim();
    if (!trimmed) {
      throw new AppError('敏感词不能为空', 400, 'PARAM_INVALID');
    }

    return await prisma.sensitiveWord.upsert({
      where: { word: trimmed },
      update: { category },
      create: { word: trimmed, category }
    });
  }

  static async deleteSensitiveWord(id: number) {
    return await prisma.sensitiveWord.delete({
      where: { id }
    });
  }

  /**
   * 在线调试沙盒 SSE 流式推流
   */
  static async sandboxStream(
    cardIndex: number,
    orientation: string,
    question: string,
    res: Response,
    overrideConfig?: {
      provider?: string;
      model?: string;
      baseUrl?: string;
      apiKey?: string;
      systemPrompt?: string;
      temperature?: number;
    }
  ) {
    // 确保存在沙盒测试专用用户（满足外键约束）
    const sandboxUser = await prisma.user.upsert({
      where: { openid: 'sandbox_admin_tester_openid' },
      update: {},
      create: {
        openid: 'sandbox_admin_tester_openid',
        bonus_energy: 999
      }
    });

    const allCards = TarotService.getAllCards();
    const card = TarotService.getCardByIndex(cardIndex) || allCards[0] || {
      index: 0,
      nameCn: '愚者'
    };

    const tempReading = await prisma.tarotReading.create({
      data: {
        user_id: sandboxUser.id,
        card_id: card.index,
        card_name: card.nameCn,
        orientation: orientation === 'reversed' ? 'reversed' : 'upright',
        user_question: question || '运营管理沙盒在线调试模拟',
        status: 'streaming'
      }
    });

    // 委派给 AiService 进行流式输出，强制声明为沙盒测试环境，跳过审核拦截
    await AiService.streamReading(tempReading.id, null, res, {
      isSandbox: true,
      overrideConfig
    });
  }
}
