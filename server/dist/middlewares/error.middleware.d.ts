import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    errorCode: string;
    constructor(message: string, statusCode?: number, errorCode?: string);
}
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
