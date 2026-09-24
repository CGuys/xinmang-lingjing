"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const constants_1 = require("./config/constants");
const os_1 = __importDefault(require("os"));
// 获取本机在局域网中的 IPv4 地址
function getLocalIPAddress() {
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
            // 跳过内部回环地址 (127.0.0.1) 和非 IPv4 地址
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}
const localIP = getLocalIPAddress();
const server = app_1.app.listen(constants_1.ENV.PORT, constants_1.ENV.HOST, () => {
    console.log(`====================================================`);
    console.log(`✨ 《心芒灵境》后端 API 服务已成功启动!`);
    console.log(`📡 本地环回访问: http://localhost:${constants_1.ENV.PORT}`);
    console.log(`🌐 局域网IP访问: http://${localIP}:${constants_1.ENV.PORT}`);
    console.log(`🔮 静态资产路径: http://${localIP}:${constants_1.ENV.PORT}/assets/tarot/cards/00.jpg`);
    console.log(`🩺 健康检查接口: http://${localIP}:${constants_1.ENV.PORT}/health`);
    console.log(`🚀 运行环境: ${constants_1.ENV.NODE_ENV} (监听地址: ${constants_1.ENV.HOST})`);
    console.log(`====================================================`);
});
// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
