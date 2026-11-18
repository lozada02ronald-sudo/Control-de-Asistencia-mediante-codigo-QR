import { NextFunction, Request, Response } from 'express';
import { redisCache } from '../../cache/redisClient.js';

interface RateLimitOptions {
  keyPrefix: string;
  maxAttempts: number;
  windowSeconds: number;
}

/**
 * Redis-backed rate limiter to mitigate brute-force and credential-stuffing attacks.
 */
export function rateLimiter({ keyPrefix, maxAttempts, windowSeconds }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const emailPart =
      typeof req.body?.email === 'string' ? `:${req.body.email.trim().toLowerCase()}` : '';
    const key = `rl:${keyPrefix}:${clientIp}${emailPart}`;

    const attempts = await redisCache.incrWithTtl(key, windowSeconds);
    if (attempts > maxAttempts) {
      const retryAfter = await redisCache.ttl(key);
      res.setHeader('Retry-After', String(retryAfter || windowSeconds));
      res.status(429).json({
        success: false,
        message: 'Demasiados intentos. Por seguridad, espera unos minutos antes de reintentar.',
        retryAfterSeconds: retryAfter || windowSeconds,
      });
      return;
    }

    next();
  };
}

