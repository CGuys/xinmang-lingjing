import { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    static login(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getStrategy(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateStrategy(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAiConfig(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateAiConfig(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCards(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getSensitiveWords(req: Request, res: Response, next: NextFunction): Promise<void>;
    static addSensitiveWord(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteSensitiveWord(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    static adjustUserEnergy(req: Request, res: Response, next: NextFunction): Promise<void>;
    static toggleBlacklist(req: Request, res: Response, next: NextFunction): Promise<void>;
    static sandboxStream(req: Request, res: Response, next: NextFunction): Promise<void>;
}
