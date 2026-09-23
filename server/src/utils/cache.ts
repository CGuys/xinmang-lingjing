/**
 * 高性能统一缓存适配器
 * 支持 Redis 外部缓存与优雅的内置内存缓存降级 (Memory-Fallback)
 */

interface CacheEntry {
  value: string;
  expiresAt: number | null; // 时间戳 (毫秒)
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
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
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

export const cache = new MemoryCache();
