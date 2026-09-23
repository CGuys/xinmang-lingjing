import { prisma } from '../models/prisma';
import { cache } from '../utils/cache';
import { DEFAULT_STRATEGY_CONFIG, DEFAULT_AI_CONFIG } from '../config/constants';

const STRATEGY_CACHE_KEY = 'system:strategy_config';
const AI_CONFIG_CACHE_KEY = 'system:ai_config';

export class ConfigService {
  /**
   * 获取当前生效的业务策略配置
   */
  static async getStrategyConfig() {
    const cached = await cache.get(STRATEGY_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // fallback
      }
    }

    const settings = await prisma.systemSetting.findMany();
    const config: Record<string, any> = { ...DEFAULT_STRATEGY_CONFIG };

    for (const setting of settings) {
      if (setting.key in config) {
        try {
          config[setting.key] = JSON.parse(setting.value);
        } catch {
          config[setting.key] = setting.value;
        }
      }
    }

    await cache.set(STRATEGY_CACHE_KEY, JSON.stringify(config), 300);
    return config;
  }

  /**
   * 更新业务策略配置
   */
  static async updateStrategyConfig(updates: Record<string, any>) {
    for (const [key, val] of Object.entries(updates)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: valStr },
        create: { key, value: valStr, description: `配置项: ${key}` }
      });
    }

    // 清空缓存
    await cache.del(STRATEGY_CACHE_KEY);
    return await this.getStrategyConfig();
  }

  /**
   * 获取当前 AI 编排配置
   */
  static async getAiConfig() {
    const cached = await cache.get(AI_CONFIG_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // fallback
      }
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_config' }
    });

    let config = { ...DEFAULT_AI_CONFIG };
    if (setting) {
      try {
        config = { ...config, ...JSON.parse(setting.value) };
      } catch (e) {
        // ignore
      }
    }

    await cache.set(AI_CONFIG_CACHE_KEY, JSON.stringify(config), 300);
    return config;
  }

  /**
   * 更新 AI 编排配置
   */
  static async updateAiConfig(updates: Record<string, any>) {
    const current = await this.getAiConfig();
    const merged = { ...current, ...updates };

    await prisma.systemSetting.upsert({
      where: { key: 'ai_config' },
      update: { value: JSON.stringify(merged) },
      create: { key: 'ai_config', value: JSON.stringify(merged), description: 'AI 配置' }
    });

    await cache.del(AI_CONFIG_CACHE_KEY);
    return merged;
  }
}
