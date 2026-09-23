"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ad_controller_1 = require("../../controllers/ad.controller");
const router = (0, express_1.Router)();
router.post('/reward-callback', ad_controller_1.AdController.rewardCallback);
exports.default = router;
