"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    static async wxLogin(req, res, next) {
        try {
            const { code } = req.body;
            const result = await auth_service_1.AuthService.wxLogin(code);
            res.json({
                code: 'SUCCESS',
                message: '登录成功',
                data: result
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
