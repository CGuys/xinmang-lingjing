import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    static wxLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
}
