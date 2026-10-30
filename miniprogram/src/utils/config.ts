/**
 * 应用全局配置
 */
// 优先从环境变量读取构建目标 API，若未指定则兜底云端正式服务器地址
const ENV_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
const DEFAULT_API_BASE = ENV_API_BASE || 'http://8.148.201.178';

export const getApiBaseUrl = (): string => {
  try {
    const custom = uni.getStorageSync('custom_api_base');
    if (custom && typeof custom === 'string' && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    // #ifdef H5
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
    // #endif
  } catch {
    // ignore
  }
  return DEFAULT_API_BASE;
};

export const setApiBaseUrl = (url: string) => {
  uni.setStorageSync('custom_api_base', url.trim().replace(/\/+$/, ''));
};

export const APP_CONFIG = {
  appName: '心芒灵境',
  subTitle: '荣格潜意识心理投射 · 3D抽牌 · 灵感疗愈',
  version: '1.0.0',
  defaultCardBack: '/static/tarot/back.jpg',
  env: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development',
  mode: import.meta.env.MODE || 'development',
  apiBase: DEFAULT_API_BASE
};
