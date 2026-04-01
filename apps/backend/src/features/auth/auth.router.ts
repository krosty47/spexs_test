import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import { loginSchema, registerSchema } from '@workflow-manager/shared';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'auth' })
export class AuthRouter {
  constructor(private readonly authService: AuthService) {}

  @Mutation({ input: loginSchema })
  async login(@Input() input: z.infer<typeof loginSchema>, @Ctx() ctx: AppContextType) {
    const result = await this.authService.login(input);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Mutation({ input: registerSchema })
  async register(@Input() input: z.infer<typeof registerSchema>, @Ctx() ctx: AppContextType) {
    const result = await this.authService.register(input);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Mutation({ input: z.object({ refreshToken: z.string() }) })
  async refresh(@Input() input: { refreshToken: string }, @Ctx() ctx: AppContextType) {
    const result = await this.authService.refresh(input.refreshToken);
    this.setAuthCookies(ctx, result.accessToken, result.refreshToken);
    return result;
  }

  @Query()
  @UseMiddlewares(AuthMiddleware)
  async me(@Ctx() ctx: AppContextType) {
    return ctx.user;
  }

  private setAuthCookies(ctx: AppContextType, accessToken: string, refreshToken: string): void {
    const res = ctx.res as { setCookie: (name: string, value: string, opts: Record<string, unknown>) => void };
    const cookieOpts = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    };
    res.setCookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 });
    res.setCookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 });
  }
}
