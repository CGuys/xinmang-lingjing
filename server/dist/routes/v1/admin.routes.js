"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../../controllers/admin.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// 管理员登录（公开）
router.post('/login', admin_controller_1.AdminController.login);
// 数据仪表盘
router.get('/dashboard', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getDashboard);
// 业务策略配置
router.get('/strategy', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getStrategy);
router.put('/strategy', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.updateStrategy);
// AI 编排配置
router.get('/ai-config', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getAiConfig);
router.put('/ai-config', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.updateAiConfig);
// 卡牌资源档案
router.get('/cards', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getCards);
// 敏感词管理
router.get('/sensitive-words', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getSensitiveWords);
router.post('/sensitive-words', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.addSensitiveWord);
router.delete('/sensitive-words/:id', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.deleteSensitiveWord);
// 用户管理
router.get('/users', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.getUsers);
router.post('/users/:userId/energy', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.adjustUserEnergy);
router.post('/users/:userId/blacklist', auth_middleware_1.requireAdminAuth, admin_controller_1.AdminController.toggleBlacklist);
// 在线调试沙盒流式解牌（支持管理端免授权/管理员调用）
router.get('/sandbox/stream', admin_controller_1.AdminController.sandboxStream);
exports.default = router;
