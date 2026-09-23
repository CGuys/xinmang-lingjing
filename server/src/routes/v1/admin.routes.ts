import { Router } from 'express';
import { AdminController } from '../../controllers/admin.controller';
import { requireAdminAuth } from '../../middlewares/auth.middleware';

const router = Router();

// 管理员登录（公开）
router.post('/login', AdminController.login);

// 数据仪表盘
router.get('/dashboard', requireAdminAuth, AdminController.getDashboard);

// 业务策略配置
router.get('/strategy', requireAdminAuth, AdminController.getStrategy);
router.put('/strategy', requireAdminAuth, AdminController.updateStrategy);

// AI 编排配置
router.get('/ai-config', requireAdminAuth, AdminController.getAiConfig);
router.put('/ai-config', requireAdminAuth, AdminController.updateAiConfig);

// 卡牌资源档案
router.get('/cards', requireAdminAuth, AdminController.getCards);

// 敏感词管理
router.get('/sensitive-words', requireAdminAuth, AdminController.getSensitiveWords);
router.post('/sensitive-words', requireAdminAuth, AdminController.addSensitiveWord);
router.delete('/sensitive-words/:id', requireAdminAuth, AdminController.deleteSensitiveWord);

// 用户管理
router.get('/users', requireAdminAuth, AdminController.getUsers);
router.post('/users/:userId/energy', requireAdminAuth, AdminController.adjustUserEnergy);
router.post('/users/:userId/blacklist', requireAdminAuth, AdminController.toggleBlacklist);

// 在线调试沙盒流式解牌（支持管理端免授权/管理员调用）
router.get('/sandbox/stream', AdminController.sandboxStream);

export default router;
