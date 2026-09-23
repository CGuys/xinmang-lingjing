"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const share_controller_1 = require("../../controllers/share.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/accept', auth_middleware_1.requireUserAuth, share_controller_1.ShareController.acceptShare);
exports.default = router;
