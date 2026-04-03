import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type TRPCContext, type ContextOptions } from 'nestjs-trpc';

export interface TrpcUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AppContextType {
  req: ContextOptions['req'];
  res: ContextOptions['res'];
  user: TrpcUser | null;
}

/** Request type with Fastify cookie support */
type RequestWithCookies = ContextOptions['req'] & { cookies?: Record<string, string> };

/** Safely extract a cookie value from the request object. */
export function getCookie(ctx: AppContextType, name: string): string | undefined {
  return (ctx.req as RequestWithCookies).cookies?.[name];
}

@Injectable()
export class AppContext implements TRPCContext {
  constructor(private readonly jwtService: JwtService) {}

  async create(opts: ContextOptions): Promise<Record<string, unknown>> {
    let user: TrpcUser | null = null;

    try {
      // Extract JWT from httpOnly cookie
      const token = getCookie({ req: opts.req } as AppContextType, 'access_token');

      if (token) {
        const payload = this.jwtService.verify(token);
        user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
        };
      }
    } catch {
      // Invalid or expired token - user remains null
    }

    // Return type satisfies TRPCContext interface; consumers cast to AppContextType
    return { req: opts.req, res: opts.res, user } satisfies AppContextType;
  }
}
