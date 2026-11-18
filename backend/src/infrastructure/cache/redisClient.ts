import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryFallback = new Map<string, MemoryEntry>();

function pruneExpiredMemory(key: string): MemoryEntry | null {
  const entry = memoryFallback.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryFallback.delete(key);
    return null;
  }
  return entry;
}

class RedisCacheService {
  private client: Redis | null = null;
  private ready = false;

  constructor() {
    if (!env.REDIS_ENABLED) return;

    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 250, 2000)),
    });

    this.client.on('ready', () => {
      this.ready = true;
    });

    this.client.on('error', () => {
      this.ready = false;
    });

    this.client.on('end', () => {
      this.ready = false;
    });

    this.client.connect().catch(() => {
      this.ready = false;
    });
  }

  public isRedisReady(): boolean {
    return this.ready && this.client !== null;
  }

  public async get(key: string): Promise<string | null> {
    if (this.isRedisReady() && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        this.ready = false;
      }
    }
    const mem = pruneExpiredMemory(key);
    return mem ? mem.value : null;
  }

  public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.isRedisReady() && this.client) {
      try {
        await this.client.setex(key, ttlSeconds, value);
        return;
      } catch {
        this.ready = false;
      }
    }
    memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisReady() && this.client) {
      try {
        await this.client.del(key);
      } catch {
        this.ready = false;
      }
    }
    memoryFallback.delete(key);
  }

  public async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (this.isRedisReady() && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, ttlSeconds);
        }
        return count;
      } catch {
        this.ready = false;
      }
    }
    const existing = pruneExpiredMemory(key);
    const nextCount = existing ? Number(existing.value) + 1 : 1;
    const expiresAt = existing ? existing.expiresAt : Date.now() + ttlSeconds * 1000;
    memoryFallback.set(key, { value: String(nextCount), expiresAt });
    return nextCount;
  }

  public async ttl(key: string): Promise<number> {
    if (this.isRedisReady() && this.client) {
      try {
        const remaining = await this.client.ttl(key);
        return remaining > 0 ? remaining : 0;
      } catch {
        this.ready = false;
      }
    }
    const mem = pruneExpiredMemory(key);
    if (!mem) return 0;
    return Math.max(0, Math.ceil((mem.expiresAt - Date.now()) / 1000));
  }
}

export const redisCache = new RedisCacheService();

