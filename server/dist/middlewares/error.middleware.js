"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
class AppError extends Error {
    statusCode;
    errorCode;
    constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, next) {
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
