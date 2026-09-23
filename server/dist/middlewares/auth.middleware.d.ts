import { Request, Response, NextFunction } from 'express';
import { AdminJwtPayload } from '../utils/jwt';
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
export declare function requireUserAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireAdminAuth(req: Request, res: Response, next: NextFunction): void;
