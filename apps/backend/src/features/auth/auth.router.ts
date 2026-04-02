import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import {
  loginSchema,
  registerSchema,
  authOutputSchema,
  trpcUserSchema,
} from '@workflow-manager/shared';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AuthService } from './auth.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import { type AppContextType, getCookie } from '../../trpc/context';

@Router({ alias: 'auth' })
export class AuthRouter {
  constructor(private readonly authService: AuthService) {}

  @Mutation({ input: loginSchema, output: authOutputSchema })
  async login(@Input() input: z.infer<typeof loginSchema>, @Ctx() ctx: AppContextType) {
    const result = await this.authService.login(input);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Mutation({ input: registerSchema, output: authOutputSchema })
  async register(@Input() input: z.infer<typeof registerSchema>, @Ctx() ctx: AppContextType) {
    const result = await this.authService.register(input);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Mutation({ input: z.object({ refreshToken: z.string().optional() }), output: authOutputSchema })
  async refresh(@Input() input: { refreshToken?: string }, @Ctx() ctx: AppContextType) {
    const token = input.refreshToken || getCookie(ctx, 'refresh_token');

    if (!token) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token provided',
      });
    }

    const result = await this.authService.refresh(token);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Query({ output: trpcUserSchema.nullable() })
  @UseMiddlewares(AuthMiddleware)
  async me(@Ctx() ctx: AppContextType) {
    return ctx.user;
  }

  private setAuthCookies(ctx: AppContextType, accessToken: string, refreshToken: string): void {
    const res = ctx.res as {
      setCookie: (name: string, value: string, opts: Record<string, unknown>) => void;
    };
    const cookieOpts = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    };
    res.setCookie('access_token', accessToken, { ...cookieOpts, maxAge: 60 * 60 });
    res.setCookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 });
  }
}
