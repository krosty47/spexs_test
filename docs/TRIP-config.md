# TRIP Project Config

## Project

name: Workflow Manager
version_file: package.json
main_branch: main
week_anchor_date: 31-03-2026

## Tutorials

enabled: false

## Test Commands

run_all: pnpm test
run_single: pnpm --filter backend test -- <filename>
coverage: pnpm --filter backend test:cov

## Technical Considerations

- **Monorepo**: Changes to `packages/prisma` or `packages/shared` may affect both apps. Always run tests for both apps after modifying shared packages.
- **tRPC type safety**: After changing a tRPC router or Zod schema, the frontend automatically gets updated types. Verify no type errors in the frontend after backend API changes.
- **Prisma migrations**: After changing `schema.prisma`, run `prisma migrate dev` to generate and apply migrations. Never edit applied migrations.
- **Feature modules**: Each backend feature is a self-contained NestJS module. New features should follow the existing feature-folder pattern.
- **Independent modules** (`src/modules/`): External API integrations must not depend on tRPC — they should be pure NestJS modules injectable anywhere.
- **Auth via httpOnly cookies**: JWT tokens are stored in httpOnly cookies. All tRPC procedures (except public ones) must be behind the auth guard.
- **Real-time updates**: When adding mutations that affect live data, emit WebSocket events to notify connected clients.
- **Zod everywhere**: Zod is the single validation library. Use it for tRPC inputs, form validation (via @hookform/resolvers), and env var validation.
- **Server Components by default**: In Next.js, only add `"use client"` when the component needs interactivity or browser APIs.

## Review Checklist Additions

- [ ] tRPC inputs validated with Zod schemas
- [ ] Prisma queries use `select`/`include` deliberately (no full-row fetches)
- [ ] No N+1 queries (check for loops with DB calls)
- [ ] List endpoints are paginated
- [ ] New feature follows the feature-folder pattern
- [ ] WebSocket events emitted for real-time-relevant mutations
- [ ] httpOnly cookie auth not bypassed
- [ ] No `any` types — use `unknown` or proper types
- [ ] Shared types/schemas in `packages/shared/` when used by both apps
- [ ] Server Components used by default, `"use client"` only when needed

## Test Structure & Priorities

- Backend tests: co-located `*.spec.ts` files, mock Prisma with `jest-mock-extended`
- Frontend tests: co-located `*.test.tsx` files, use Vitest + Testing Library
- E2E tests: `apps/frontend/e2e/` with Playwright
- Priority: service logic > error scenarios > component rendering > E2E happy paths
