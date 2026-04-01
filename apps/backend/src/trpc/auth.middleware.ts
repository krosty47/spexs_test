import { Injectable } from '@nestjs/common';
import { type TRPCMiddleware, type MiddlewareOptions } from 'nestjs-trpc';
import { TRPCError } from '@trpc/server';
import type { AppContextType } from './context';

@Injectable()
export class AuthMiddleware implements TRPCMiddleware {
  async use(opts: MiddlewareOptions) {
    const { ctx, next } = opts;
    const context = ctx as AppContextType;

    if (!context.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    return next();
  }
}
