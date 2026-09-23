import { Request, Response, NextFunction } from 'express';
import { TarotService } from '../services/tarot.service';
import { AiService } from '../services/ai.service';
import { AppError } from '../middlewares/error.middleware';

export class TarotController {
  /**
   * 发起抽牌并扣减能量
   */
  static async drawCard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const { question } = req.body;
      const result = await TarotService.drawCard(req.user.id, question);

      res.json({
        code: 'SUCCESS',
        message: '抽牌成功',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * SSE 流式返回大模型心理投射解读内容
   */
  static async streamReading(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const { reading_id } = req.params;
      await AiService.streamReading(reading_id, req.user.id, res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取用户历史抽牌记录
   */
  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

      const history = await TarotService.getHistory(req.user.id, page, pageSize);
      res.json({
        code: 'SUCCESS',
        message: '获取历史记录成功',
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取卡牌库全量列表（小程序可用于卡牌图鉴展示）
   */
  static async getCards(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string;
      const cards = TarotService.getAllCards(category);
      res.json({
        code: 'SUCCESS',
        message: '获取卡牌库成功',
        data: {
          total: cards.length,
          cards
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
