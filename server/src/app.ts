import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { ENV } from './config/constants';

export const app = express();

// 1. 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. 静态资源托管（提供 78 张卡牌原画插画访问）
let staticAssetsPath = path.resolve(process.cwd(), ENV.ASSETS_PATH);
if (!fs.existsSync(staticAssetsPath)) {
  staticAssetsPath = path.resolve(__dirname, '../../assets');
}
app.use('/assets', express.static(staticAssetsPath));

// 3. 基础健康检查与服务标识
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '心芒灵境 · 心理疗愈卡牌服务',
    time: new Date().toISOString()
  });
});

// 4. API 路由挂载
app.use('/api/v1', apiRoutes);

// 5. 全局异常处理中间件
app.use(errorHandler);
