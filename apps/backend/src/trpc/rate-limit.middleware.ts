import { Injectable } from '@nestjs/common';
import { type TRPCMiddleware, type MiddlewareOptions } from 'nestjs-trpc';
import { TRPCError } from '@trpc/server';
import type { AppContextType } from './context';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter for tRPC procedures.
 * Tracks request counts per IP with a sliding window.
 */
@Injectable()
export class RateLimitMiddleware implements TRPCMiddleware {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 5;
  private readonly windowMs = 60_000;

  async use(opts: MiddlewareOptions) {
    const { ctx, next } = opts;
    const context = ctx as AppContextType;
    const req = context.req as { ip?: string; socket?: { remoteAddress?: string } };
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    const now = Date.now();

    // Periodic cleanup of expired entries (every 100 requests)
    if (this.store.size > 100) {
      for (const [key, val] of this.store) {
        if (now > val.resetAt) this.store.delete(key);
      }
    }

    const entry = this.store.get(ip);

    if (!entry || now > entry.resetAt) {
      // First request or window expired — start fresh
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return next();
    }

    if (entry.count >= this.maxRequests) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      });
    }

    entry.count++;
    return next();
  }
}
