import { Router } from 'express';
import { TarotController } from '../../controllers/tarot.controller';
import { requireUserAuth } from '../../middlewares/auth.middleware';

const router = Router();

// 卡牌档案库（公开）
router.get('/cards', TarotController.getCards);

// AI 智能识别与卡牌对应 OSS 页面资源检索 (支持 GET / POST)
router.get('/card-resource', TarotController.matchCardResource);
router.post('/card-resource', TarotController.matchCardResource);

// 用户抽牌
router.post('/draw', requireUserAuth, TarotController.drawCard);

// 用户 SSE 解读流
router.get('/stream/:reading_id', requireUserAuth, TarotController.streamReading);

// 用户单条抽牌解读记录（用于状态恢复与降级同步）
router.get('/reading/:reading_id', requireUserAuth, TarotController.getReading);

// 用户历史记录
router.get('/history', requireUserAuth, TarotController.getHistory);

export default router;
