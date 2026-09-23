"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareController = void 0;
const share_service_1 = require("../services/share.service");
const error_middleware_1 = require("../middlewares/error.middleware");
class ShareController {
    static async acceptShare(req, res, next) {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('未授权访问', 401, 'UNAUTHORIZED');
            }
            const { inviter_id } = req.body;
            const result = await share_service_1.ShareService.acceptShare(req.user.id, inviter_id);
            res.json({
                code: 'SUCCESS',
                message: result.message,
                data: result
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ShareController = ShareController;
