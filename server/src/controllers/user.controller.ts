import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../middlewares/error.middleware';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const profile = await UserService.getProfile(req.user.id);
      res.json({
        code: 'SUCCESS',
        message: '获取用户信息成功',
        data: profile
      });
    } catch (err) {
      next(err);
    }
  }
}
