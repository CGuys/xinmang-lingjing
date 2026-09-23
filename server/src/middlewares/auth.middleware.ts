import { Request, Response, NextFunction } from 'express';
import { verifyUserToken, verifyAdminToken, UserJwtPayload, AdminJwtPayload } from '../utils/jwt';
import { AppError } from './error.middleware';
import { prisma } from '../models/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        openid: string;
      };
      admin?: AdminJwtPayload;
    }
  }
}

export async function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('未提供有效的认证令牌，请先登录', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);
  const decoded = verifyUserToken(token);
  if (!decoded) {
    return next(new AppError('认证令牌已过期或无效，请重新登录', 401, 'INVALID_TOKEN'));
  }

  // 校验用户是否存在与是否在黑名单中
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    return next(new AppError('用户账号不存在', 401, 'USER_NOT_FOUND'));
  }

  if (user.is_blacklisted) {
    return next(new AppError('当前账号已被风控限制使用，请联系客服', 403, 'USER_BANNED'));
  }

  req.user = {
    id: user.id,
    openid: user.openid
  };

  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('未授权的管理员访问请求', 401, 'ADMIN_UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    return next(new AppError('管理员令牌已失效，请重新登录', 401, 'ADMIN_INVALID_TOKEN'));
  }

  req.admin = decoded;
  next();
}
