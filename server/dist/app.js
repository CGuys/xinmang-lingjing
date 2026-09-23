"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const constants_1 = require("./config/constants");
exports.app = (0, express_1.default)();
// 1. 基础中间件
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
// 2. 静态资源托管（提供 78 张卡牌原画插画访问）
let staticAssetsPath = path_1.default.resolve(process.cwd(), constants_1.ENV.ASSETS_PATH);
if (!fs_1.default.existsSync(staticAssetsPath)) {
    staticAssetsPath = path_1.default.resolve(__dirname, '../../assets');
}
exports.app.use('/assets', express_1.default.static(staticAssetsPath));
// 3. 基础健康检查与服务标识
exports.app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: '心芒灵境 · 心理疗愈卡牌服务',
        time: new Date().toISOString()
    });
});
// 4. API 路由挂载
exports.app.use('/api/v1', routes_1.default);
// 5. 全局异常处理中间件
exports.app.use(error_middleware_1.errorHandler);
