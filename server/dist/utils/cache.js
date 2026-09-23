"use strict";
/**
 * 高性能统一缓存适配器
 * 支持 Redis 外部缓存与优雅的内置内存缓存降级 (Memory-Fallback)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
class MemoryCache {
    store = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds) {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value, expiresAt });
    }
    async incr(key, ttlSeconds) {
        const currentStr = await this.get(key);
        let num = currentStr ? parseInt(currentStr, 10) || 0 : 0;
        num += 1;
        await this.set(key, num.toString(), ttlSeconds);
        return num;
    }
    async del(key) {
        this.store.delete(key);
    }
    async flushAll() {
        this.store.clear();
    }
}
exports.cache = new MemoryCache();
