/**
 * 高性能统一缓存适配器 (Redis 企业级生产驱动 + 内存弹性降级)
 * 优先连接真实 Redis 实例进行分布式缓存与原子计数；
 * 若未配置或出现短时网络抖动，自动平滑降级至进程内内存缓存，确保高可用。
 */

import Redis from 'ioredis';
import { ENV } from '../config/constants';

interface CacheEntry {
  value: string;
  expiresAt: number | null; // 毫秒时间戳
}

class MemoryCache {
  private store: Map<string, CacheEntry> = new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const currentStr = await this.get(key);
    let num = currentStr ? parseInt(currentStr, 10) || 0 : 0;
    num += 1;
    await this.set(key, num.toString(), ttlSeconds);
    return num;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flushAll(): Promise<void> {
    this.store.clear();
  }
}

class CacheManager {
  private redisClient: Redis | null = null;
  private memoryFallback: MemoryCache = new MemoryCache();
  private isConnected: boolean = false;
  private hasReportedConnected: boolean = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    const redisUrl = ENV.REDIS_URL || 'redis://127.0.0.1:6379';

    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        enableOfflineQueue: false, // 离线时不无限阻塞请求，快速降级
        retryStrategy: (times) => {
          // 指数退避，上限 5 秒
          return Math.min(times * 300, 5000);
        }
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        if (!this.hasReportedConnected) {
          console.log(`⚡️ [Redis] 成功连接至 Redis 缓存服务 (${redisUrl})`);
          this.hasReportedConnected = true;
        }
      });

      this.redisClient.on('ready', () => {
        this.isConnected = true;
      });

      this.redisClient.on('error', (err: any) => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        if (wasConnected) {
          console.warn(`⚠️ [Redis] 连接中断: ${err.message}，临时切换至内存缓存模式`);
        }
      });

      this.redisClient.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      console.warn(`⚠️ [Redis] 初始化异常: ${err.message}，启用内存缓存降级`);
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (err: any) {
        console.warn(`[Redis] get("${key}") 失败: ${err.message}，降级读内存缓存`);
      }
    }
    return this.memoryFallback.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, value);
        }
        return;
      } catch (err: any) {
        console.warn(`[Redis] set("${key}") 失败: ${err.message}，降级写内存缓存`);
      }
    }
    await this.memoryFallback.set(key, value, ttlSeconds);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isConnected && this.redisClient) {
      try {
        const val = await this.redisClient.incr(key);
        if (ttlSeconds && ttlSeconds > 0) {
          // 若为新键（刚 incr 变为 1）或未设置过期时间，则追加过期时间
          const currentTtl = await this.redisClient.ttl(key);
          if (currentTtl < 0) {
            await this.redisClient.expire(key, ttlSeconds);
          }
        }
        return val;
      } catch (err: any) {
        console.warn(`[Redis] incr("${key}") 失败: ${err.message}，降级内存计数`);
      }
    }
    return this.memoryFallback.incr(key, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err: any) {
        console.warn(`[Redis] del("${key}") 失败: ${err.message}，降级内存删除`);
      }
    }
    await this.memoryFallback.del(key);
  }

  async flushAll(): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.flushdb();
        return;
      } catch (err: any) {
        console.warn(`[Redis] flushdb 失败: ${err.message}`);
      }
    }
    await this.memoryFallback.flushAll();
  }

  getStatus() {
    return {
      driver: this.isConnected ? 'redis' : 'memory-fallback',
      redisConnected: this.isConnected,
      redisUrl: ENV.REDIS_URL || 'redis://127.0.0.1:6379'
    };
  }
}

export const cache = new CacheManager();
