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
      const cards = await TarotService.loadDeckFromDb();
      const filtered = category && category !== 'all' ? cards.filter((c) => c.category === category) : cards;
      res.json({
        code: 'SUCCESS',
        message: '获取卡牌库成功',
        data: {
          total: filtered.length,
          cards: filtered
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 核心接口：根据 AI 给出的文本或卡牌名称，智能匹配并返回对应的卡牌及其页面 OSS 资源图片
   */
  static async matchCardResource(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.query || req.body?.query || req.body?.ai_output || '') as string;
      if (!query || !query.trim()) {
        throw new AppError('缺少查询参数 query 或 ai_output', 400, 'PARAM_MISSING');
      }

      const matchedCard = await TarotService.getCardByAiMatch(query);
      if (!matchedCard) {
        res.json({
          code: 'NOT_FOUND',
          message: '未能在 78 张卡牌库中匹配到与 AI 意向或卡牌名称对应的资源',
          data: null
        });
        return;
      }

      res.json({
        code: 'SUCCESS',
        message: `成功根据 AI 意向识别卡牌【${matchedCard.nameCn}】及对应 OSS 页面资源`,
        data: {
          card: matchedCard,
          assets: {
            home: {
              page: 'pages/home',
              description: '首页 3D 抽牌翻牌缩略图',
              ossKey: matchedCard.ossHomeKey,
              imageUrl: matchedCard.image
            },
            reading: {
              page: 'pages/reading',
              description: '能量解析与朋友圈海报页高清大图',
              ossKey: matchedCard.ossReadingKey,
              imageUrl: matchedCard.imageLarge
            },
            back: {
              page: 'pages/home',
              description: '通用艺术卡背',
              ossKey: matchedCard.ossBackKey,
              imageUrl: matchedCard.backImage
            }
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 根据 ID 查询单条抽牌解读记录（用于前端状态恢复与流式降级同步）
   */
  static async getReading(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const { reading_id } = req.params;
      const reading = await TarotService.getReadingById(reading_id, req.user.id);

      res.json({
        code: 'SUCCESS',
        message: '获取抽牌记录成功',
        data: reading
      });
    } catch (err) {
      next(err);
    }
  }
}

