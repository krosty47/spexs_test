import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register'];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/** Decode a JWT payload without verification (we only need the `exp` claim). */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = Buffer.from(base64, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns true when the token expires within the given buffer (default 2 min). */
function isTokenExpiringSoon(token: string, bufferSeconds = 120): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp - bufferSeconds <= Date.now() / 1000;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // No tokens at all → redirect to login
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Access token is still fresh → continue
  if (accessToken && !isTokenExpiringSoon(accessToken)) {
    return NextResponse.next();
  }

  // Access token missing or expiring soon — attempt server-side refresh
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${BACKEND_URL}/trpc/auth.refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshToken}`,
        },
        body: JSON.stringify({ json: {} }),
      });

      if (refreshRes.ok) {
        // Forward the Set-Cookie headers from the backend to the browser
        const response = NextResponse.next();
        const setCookies = refreshRes.headers.getSetCookie();
        for (const cookie of setCookies) {
          response.headers.append('Set-Cookie', cookie);
        }
        return response;
      }
    } catch {
      // Refresh failed — fall through to redirect
    }
  }

  // Refresh failed or no refresh token → redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
