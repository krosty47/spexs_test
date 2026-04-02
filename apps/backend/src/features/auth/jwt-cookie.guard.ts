import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard that extracts and validates JWT from httpOnly access_token cookie.
 * Populates request.user with { id, email, role } on success.
 *
 * Use this for non-tRPC controllers (e.g. SSE endpoints) where the
 * tRPC AuthMiddleware doesn't apply.
 */
@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('No access token');
    }

    try {
      const payload = this.jwtService.verify(token);

      if (
        typeof payload.sub !== 'string' || !payload.sub ||
        typeof payload.email !== 'string' || !payload.email ||
        typeof payload.role !== 'string' || !payload.role
      ) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
