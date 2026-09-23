import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { ConfigService } from '../services/config.service';
import { TarotService } from '../services/tarot.service';

export class AdminController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AdminService.login(username, password);
      res.json({
        code: 'SUCCESS',
        message: '管理员登录成功',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json({
        code: 'SUCCESS',
        message: '获取数据概览成功',
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStrategy(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await ConfigService.getStrategyConfig();
      res.json({
        code: 'SUCCESS',
        message: '获取策略配置成功',
        data: config
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStrategy(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ConfigService.updateStrategyConfig(req.body);
      res.json({
        code: 'SUCCESS',
        message: '业务策略更新成功，已即时生效',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAiConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await ConfigService.getAiConfig();
      res.json({
        code: 'SUCCESS',
        message: '获取 AI 配置成功',
        data: config
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateAiConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ConfigService.updateAiConfig(req.body);
      res.json({
        code: 'SUCCESS',
        message: 'AI 编排配置已保存',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCards(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search } = req.query;
      let cards = TarotService.getAllCards(category as string);

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        cards = cards.filter(
          (c) =>
            c.nameCn.toLowerCase().includes(q) ||
            c.nameEn.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      res.json({
        code: 'SUCCESS',
        message: '获取卡牌档案成功',
        data: {
          total: cards.length,
          cards
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSensitiveWords(req: Request, res: Response, next: NextFunction) {
    try {
      const words = await AdminService.getSensitiveWords();
      res.json({
        code: 'SUCCESS',
        message: '获取违禁词库成功',
        data: words
      });
    } catch (err) {
      next(err);
    }
  }

  static async addSensitiveWord(req: Request, res: Response, next: NextFunction) {
    try {
      const { word, category } = req.body;
      const created = await AdminService.addSensitiveWord(word, category);
      res.json({
        code: 'SUCCESS',
        message: '添加违禁词成功',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSensitiveWord(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await AdminService.deleteSensitiveWord(id);
      res.json({
        code: 'SUCCESS',
        message: '删除违禁词成功',
        data: null
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
      const search = req.query.search as string;

      const result = await AdminService.getUsers(page, pageSize, search);
      res.json({
        code: 'SUCCESS',
        message: '获取用户列表成功',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async adjustUserEnergy(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      const user = await AdminService.adjustUserEnergy(userId, parseInt(amount, 10) || 0);
      res.json({
        code: 'SUCCESS',
        message: '调整用户能量成功',
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleBlacklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { isBlacklisted } = req.body;
      const user = await AdminService.toggleBlacklist(userId, Boolean(isBlacklisted));
      res.json({
        code: 'SUCCESS',
        message: isBlacklisted ? '用户已加入封禁黑名单' : '用户已解除封禁',
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  static async sandboxStream(req: Request, res: Response, next: NextFunction) {
    try {
      const cardIndex = parseInt(req.query.card_index as string, 10) || 0;
      const orientation = (req.query.orientation as string) || 'upright';
      const question = (req.query.question as string) || '';

      await AdminService.sandboxStream(cardIndex, orientation, question, res);
    } catch (err) {
      next(err);
    }
  }
}
