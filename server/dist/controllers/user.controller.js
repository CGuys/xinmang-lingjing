"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
const error_middleware_1 = require("../middlewares/error.middleware");
class UserController {
    static async getProfile(req, res, next) {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('未授权访问', 401, 'UNAUTHORIZED');
            }
            const profile = await user_service_1.UserService.getProfile(req.user.id);
            res.json({
                code: 'SUCCESS',
                message: '获取用户信息成功',
                data: profile
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
