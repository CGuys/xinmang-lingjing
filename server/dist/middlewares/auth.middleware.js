"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUserAuth = requireUserAuth;
exports.requireAdminAuth = requireAdminAuth;
const jwt_1 = require("../utils/jwt");
const error_middleware_1 = require("./error.middleware");
const prisma_1 = require("../models/prisma");
async function requireUserAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new error_middleware_1.AppError('未提供有效的认证令牌，请先登录', 401, 'UNAUTHORIZED'));
    }
    const token = authHeader.substring(7);
    const decoded = (0, jwt_1.verifyUserToken)(token);
    if (!decoded) {
        return next(new error_middleware_1.AppError('认证令牌已过期或无效，请重新登录', 401, 'INVALID_TOKEN'));
    }
    // 校验用户是否存在与是否在黑名单中
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: decoded.userId }
    });
    if (!user) {
        return next(new error_middleware_1.AppError('用户账号不存在', 401, 'USER_NOT_FOUND'));
    }
    if (user.is_blacklisted) {
        return next(new error_middleware_1.AppError('当前账号已被风控限制使用，请联系客服', 403, 'USER_BANNED'));
    }
    req.user = {
        id: user.id,
        openid: user.openid
    };
    next();
}
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new error_middleware_1.AppError('未授权的管理员访问请求', 401, 'ADMIN_UNAUTHORIZED'));
    }
    const token = authHeader.substring(7);
    const decoded = (0, jwt_1.verifyAdminToken)(token);
    if (!decoded) {
        return next(new error_middleware_1.AppError('管理员令牌已失效，请重新登录', 401, 'ADMIN_INVALID_TOKEN'));
    }
    req.admin = decoded;
    next();
}
