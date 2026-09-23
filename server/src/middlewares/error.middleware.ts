import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode = 400, errorCode = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || '服务器内部异常，请稍后重试';

  if (statusCode >= 500) {
    console.error('Unhandled Error:', err);
  }

  res.status(statusCode).json({
    code: errorCode,
    message,
    data: null,
    timestamp: Date.now()
  });
}
