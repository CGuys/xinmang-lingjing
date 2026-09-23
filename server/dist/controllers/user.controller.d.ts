import { Request, Response, NextFunction } from 'express';
export declare class UserController {
    static getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
}
