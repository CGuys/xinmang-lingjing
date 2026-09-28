import { Request, Response, NextFunction } from 'express';
import { ShareService } from '../services/share.service';
import { AppError } from '../middlewares/error.middleware';

export class ShareController {
  static async acceptShare(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('未授权访问', 401, 'UNAUTHORIZED');
      }

      const { inviter_id } = req.body;
      const result = await ShareService.acceptShare(req.user.id, inviter_id);

      res.json({
        code: 'SUCCESS',
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getShareQrcode(req: Request, res: Response, next: NextFunction) {
    try {
      const inviterId = (req.query.inviter_id as string) || (req.user?.id as string) || '';
      const { buffer, contentType } = await ShareService.getQrcodeBuffer(inviterId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

