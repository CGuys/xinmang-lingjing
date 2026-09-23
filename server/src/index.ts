import { app } from './app';
import { ENV } from './config/constants';

import os from 'os';

// 获取本机在局域网中的 IPv4 地址
function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();
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

const server = app.listen(ENV.PORT, ENV.HOST, () => {
  console.log(`====================================================`);
  console.log(`✨ 《心芒灵境》后端 API 服务已成功启动!`);
  console.log(`📡 本地环回访问: http://localhost:${ENV.PORT}`);
  console.log(`🌐 局域网IP访问: http://${localIP}:${ENV.PORT}`);
  console.log(`🔮 静态资产路径: http://${localIP}:${ENV.PORT}/assets/tarot/cards/00.jpg`);
  console.log(`🩺 健康检查接口: http://${localIP}:${ENV.PORT}/health`);
  console.log(`🚀 运行环境: ${ENV.NODE_ENV} (监听地址: ${ENV.HOST})`);
  console.log(`====================================================`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
