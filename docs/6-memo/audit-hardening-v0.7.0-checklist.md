# Audit & Hardening v0.7.0 - Verification Checklist

## Task 1: Redis Removal

- [x] Redis service removed from `docker-compose.yml`
- [x] `redis_data` volume removed from `docker-compose.yml`
- [x] Redis env vars removed from `.env.example`
- [x] Redis env vars removed from `.env`
- [x] `REDIS_URL` removed from `apps/backend/src/config/env.validation.ts`
- [x] Redis references updated in `docs/ARCHI.md`

## Task 2: Security Hardening

- [x] `bodyLimit: 1_048_576` (1 MB) added to FastifyAdapter
- [x] Helmet CSP configured (disabled in development, strict in production)
- [x] CORS parses comma-separated origins from `CORS_ORIGIN` env var
- [x] `RateLimitMiddleware` created as tRPC middleware (in-memory, per-IP tracking)
- [x] Rate limiting applied to `auth.login`, `auth.register`, `auth.refresh` mutations
- [x] `RateLimitMiddleware` registered in `TrpcModule`

## Task 3: End-to-End Type Safety Audit

- [x] All tRPC procedures have Zod input and output schemas (confirmed)
- [x] Frontend uses `inferRouterOutputs<AppRouter>` (confirmed)
- [x] Inline type annotations removed from `event-detail.component.tsx` (comments + history callbacks)

## Task 4: Separation of Responsibilities

- [x] `UsersService` extracted with `findAll(excludeUserId)` method
- [x] `UsersRouter` delegates to `UsersService` (no more direct Prisma access)
- [x] `UsersModule` registers `UsersService` as provider
- [x] All other routers confirmed as thin (delegate to services)

## Task 5: Error Handling

- [x] `GlobalExceptionFilter` enhanced with structured logging (NestJS `Logger`)
- [x] Stack traces stripped in production for non-tRPC errors
- [x] Stack traces included in development for debugging
- [x] tRPC errors NOT handled in filter (tRPC handles its own errors)
- [x] All services throw `TRPCError` with correct codes (confirmed)
- [x] Frontend ErrorBoundary wraps dashboard content (confirmed)
- [x] Frontend toast system shows mutation errors via global `onError` (confirmed)

## Task 6: tRPC Layer Structure

- [x] `[key: string]: unknown` index signature removed from `AppContextType`
- [x] `AppContext.create()` return type uses `Record<string, unknown>` to satisfy library interface
- [x] `AppContextType` keeps strict shape (`req`, `res`, `user`) for consumer type safety
- [x] `protectedProcedure` pattern via `AuthMiddleware` verified
- [x] Router merging via nestjs-trpc decorators verified
- [x] Frontend tRPC client setup verified

## Task 7: Comment Input Sanitization

- [x] `.trim()` added to `addCommentSchema.content`
- [x] `.min(1, 'Comment cannot be empty')` validates after trim
- [x] `.transform()` strips HTML tags via `/<[^>]*>/g` regex
- [x] Tests added: trim, HTML strip, reject empty after trim, preserve normal text

## Task 8: Final Verification

- [x] `pnpm --filter backend test` passes (147/147 tests, 13 suites)
- [x] `pnpm --filter backend build` passes
- [x] `pnpm --filter frontend build` passes
- [x] TypeScript type-check passes (`tsc --noEmit`)
