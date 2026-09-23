"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tarot_controller_1 = require("../../controllers/tarot.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// 卡牌档案库（公开）
router.get('/cards', tarot_controller_1.TarotController.getCards);
// 用户抽牌
router.post('/draw', auth_middleware_1.requireUserAuth, tarot_controller_1.TarotController.drawCard);
// 用户 SSE 解读流
router.get('/stream/:reading_id', auth_middleware_1.requireUserAuth, tarot_controller_1.TarotController.streamReading);
// 用户历史记录
router.get('/history', auth_middleware_1.requireUserAuth, tarot_controller_1.TarotController.getHistory);
exports.default = router;
