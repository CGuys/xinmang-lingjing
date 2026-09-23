import { Router } from 'express';
import { TarotController } from '../../controllers/tarot.controller';
import { requireUserAuth } from '../../middlewares/auth.middleware';

const router = Router();

// 卡牌档案库（公开）
router.get('/cards', TarotController.getCards);

// 用户抽牌
router.post('/draw', requireUserAuth, TarotController.drawCard);

// 用户 SSE 解读流
router.get('/stream/:reading_id', requireUserAuth, TarotController.streamReading);

// 用户历史记录
router.get('/history', requireUserAuth, TarotController.getHistory);

export default router;
