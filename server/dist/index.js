"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const constants_1 = require("./config/constants");
const server = app_1.app.listen(constants_1.ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`✨ 《心芒灵境》后端 API 服务已成功启动!`);
    console.log(`📡 服务监听端口: http://localhost:${constants_1.ENV.PORT}`);
    console.log(`🔮 静态资产路径: http://localhost:${constants_1.ENV.PORT}/assets/tarot/cards/00.jpg`);
    console.log(`🩺 健康检查接口: http://localhost:${constants_1.ENV.PORT}/health`);
    console.log(`🚀 运行环境: ${constants_1.ENV.NODE_ENV}`);
    console.log(`====================================================`);
});
// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
