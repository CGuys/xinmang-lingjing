/**
 * 应用全局配置
 */
const DEFAULT_API_BASE = 'http://192.168.110.41:3000';

export const getApiBaseUrl = (): string => {
  try {
    const custom = uni.getStorageSync('custom_api_base');
    if (custom && typeof custom === 'string' && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
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
  defaultCardBack: '/static/tarot/back.jpg'
};
