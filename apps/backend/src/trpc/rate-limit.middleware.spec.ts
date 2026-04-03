import { RateLimitMiddleware } from './rate-limit.middleware';
import { TRPCError } from '@trpc/server';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;

  beforeEach(() => {
    middleware = new RateLimitMiddleware();
  });

  const createMockOpts = (ip: string = '127.0.0.1') => {
    const next = jest.fn().mockResolvedValue({ ok: true });
    return {
      ctx: {
        req: { ip, socket: { remoteAddress: ip } },
        res: {},
        user: null,
      },
      next,
      type: 'mutation' as const,
      path: 'auth.login',
      rawInput: {},
      meta: undefined,
      input: undefined,
    };
  };

  it('should allow requests under the threshold', async () => {
    const opts = createMockOpts();
    await middleware.use(opts);
    expect(opts.next).toHaveBeenCalled();
  });

  it('should block requests over the threshold with TOO_MANY_REQUESTS', async () => {
    const opts = createMockOpts('192.168.1.1');

    // Exhaust the limit (default: 5 requests per window)
    for (let i = 0; i < 5; i++) {
      const callOpts = createMockOpts('192.168.1.1');
      await middleware.use(callOpts);
    }

    // 6th request should be blocked
    await expect(middleware.use(opts)).rejects.toThrow(TRPCError);
    await expect(middleware.use(createMockOpts('192.168.1.1'))).rejects.toThrow(
      expect.objectContaining({ code: 'TOO_MANY_REQUESTS' }),
    );
  });

  it('should track per-IP independently', async () => {
    // Exhaust limit for IP A
    for (let i = 0; i < 5; i++) {
      await middleware.use(createMockOpts('10.0.0.1'));
    }

    // IP B should still be allowed
    const optsB = createMockOpts('10.0.0.2');
    await middleware.use(optsB);
    expect(optsB.next).toHaveBeenCalled();

    // IP A should be blocked
    await expect(middleware.use(createMockOpts('10.0.0.1'))).rejects.toThrow(TRPCError);
  });

  it('should reset after TTL window expires', async () => {
    // Override windowMs with short TTL for testing
    middleware = new RateLimitMiddleware();
    Object.assign(middleware, { windowMs: 100 }); // 100ms window

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await middleware.use(createMockOpts('10.0.0.3'));
    }

    // Should be blocked
    await expect(middleware.use(createMockOpts('10.0.0.3'))).rejects.toThrow(TRPCError);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again
    const opts = createMockOpts('10.0.0.3');
    await middleware.use(opts);
    expect(opts.next).toHaveBeenCalled();
  });
});
