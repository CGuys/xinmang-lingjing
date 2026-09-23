/**
 * 高性能统一缓存适配器
 * 支持 Redis 外部缓存与优雅的内置内存缓存降级 (Memory-Fallback)
 */
declare class MemoryCache {
    private store;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    incr(key: string, ttlSeconds?: number): Promise<number>;
    del(key: string): Promise<void>;
    flushAll(): Promise<void>;
}
export declare const cache: MemoryCache;
export {};
