"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUserToken = signUserToken;
exports.verifyUserToken = verifyUserToken;
exports.signAdminToken = signAdminToken;
exports.verifyAdminToken = verifyAdminToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../config/constants");
function signUserToken(payload) {
    return jsonwebtoken_1.default.sign(payload, constants_1.ENV.JWT_SECRET, { expiresIn: constants_1.ENV.JWT_EXPIRES_IN });
}
function verifyUserToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, constants_1.ENV.JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
function signAdminToken(payload) {
    return jsonwebtoken_1.default.sign(payload, constants_1.ENV.ADMIN_JWT_SECRET, { expiresIn: constants_1.ENV.ADMIN_JWT_EXPIRES_IN });
}
function verifyAdminToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, constants_1.ENV.ADMIN_JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
