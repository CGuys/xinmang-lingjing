import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async wxLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const result = await AuthService.wxLogin(code);
      res.json({
        code: 'SUCCESS',
        message: '登录成功',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}
