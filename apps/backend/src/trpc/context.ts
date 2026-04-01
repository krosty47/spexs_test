import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type TRPCContext, type ContextOptions } from 'nestjs-trpc';

export interface TrpcUser {
  id: string;
  email: string;
  role: string;
}

export interface AppContextType {
  [key: string]: unknown;
  req: ContextOptions['req'];
  res: ContextOptions['res'];
  user: TrpcUser | null;
}

@Injectable()
export class AppContext implements TRPCContext {
  constructor(private readonly jwtService: JwtService) {}

  async create(opts: ContextOptions): Promise<AppContextType> {
    let user: TrpcUser | null = null;

    try {
      // Extract JWT from httpOnly cookie
      const cookies = (opts.req as unknown as { cookies?: Record<string, string> }).cookies;
      const token = cookies?.access_token;

      if (token) {
        const payload = this.jwtService.verify(token);
        user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        };
      }
    } catch {
      // Invalid or expired token - user remains null
    }

    return { req: opts.req, res: opts.res, user };
  }
}
