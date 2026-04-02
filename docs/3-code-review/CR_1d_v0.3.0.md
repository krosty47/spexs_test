# Code Review: Notifications System (v0.4.0 Feature)

**Review Date**: 2026-04-02
**Version**: 0.3.0
**Files Reviewed**: 20 files (10 modified, 10 new)

---

## Executive Summary

APPROVED with minor observations. The notifications system implementation is thorough, well-structured, and closely follows the plan. Security (SSE auth via httpOnly cookie, notification ownership validation), type safety, error handling, and test coverage are all solid. One lint fix was applied during review.

---

## Changes Overview

Implementation of a complete in-app notifications system with three pillars:

1. **Backend persistence**: New `Notification` Prisma model with `NotificationType` enum, user-scoped CRUD operations, and tRPC router with protected procedures (list, unreadCount, markAsRead, markAllAsRead).

2. **Real-time delivery**: Refactored `NotificationsService` from a single broadcast Subject to a `Map<userId, Subject[]>` pattern for user-scoped SSE. Added `JwtCookieGuard` on the SSE controller endpoint. Added a `send()` facade that persists to DB and pushes SSE in one call.

3. **Email on event trigger**: `EventsService.trigger()` now reads workflow recipients, sends emails to EMAIL channel recipients via `ResendEmailService` (fire-and-forget with `Promise.allSettled`), and creates in-app notifications for the workflow owner.

4. **Frontend UI**: Generic `useSSE` hook, notification-specific `useNotifications` hook (invalidates tRPC queries on SSE message), `NotificationBell` with unread badge, `NotificationDropdown` with mark-as-read and event linking, integrated into dashboard layout header.

---

## Test Summary

- **Test files**: 8 total (1 new: notifications.service.spec.ts, 1 modified: events.service.spec.ts)
- **Test cases**: 102 (102 passed, 0 failed) -- 20 new NotificationsService tests + 5 new EventsService trigger tests
- **TDD compliance**: All services have tests: Yes
- **Key scenarios covered**:
  - User-scoped SSE: creates Subject per user, emits only to correct user, removes on unsubscribe, multiple subscribers per user
  - send() persists to DB and pushes SSE event; works even when user is offline
  - findAllForUser returns paginated results, filters by unreadOnly, scoped to userId
  - getUnreadCount returns correct count, returns 0 when all read
  - markAsRead validates ownership (FORBIDDEN), handles not found (NOT_FOUND), is idempotent
  - markAllAsRead batch updates, returns count
  - EventsService.trigger sends email to EMAIL recipients, does not block on email failure, creates in-app notification for owner, handles no recipients gracefully

---

## Findings

### Critical Issues

None

### Major Issues

None

### Minor Issues

1. **Unused import (FIXED)**: `TRPCError` was imported but never used in `notifications.service.spec.ts`. Removed during review.

2. **Unnecessary type assertion**: `workflow.userId as string` in `events.service.ts` line 159 -- `userId` is non-nullable `String` in the Prisma schema, so the assertion is redundant. Harmless but could be removed for clarity.

3. **`as unknown as Recipient[]` double cast**: In `events.service.ts` line 167, `workflow.recipients` (a Prisma `Json?` field) is cast via `as unknown as Recipient[]`. This is the standard pattern for Prisma JSON fields where the shape is known at the application layer. Acceptable but worth noting -- a Zod parse (e.g., `z.array(recipientSchema).parse()`) would provide runtime validation. Low risk since the data is written by the app itself.

### Suggestions

1. **Navigation via Next.js router**: `notification-dropdown.component.tsx` uses `window.location.href` for navigation to event detail pages (line 128). Using Next.js `useRouter().push()` would enable client-side navigation without a full page reload.

2. **Dropdown overlay accessibility**: The notification dropdown uses a `<div>` overlay for closing on outside click. A more accessible approach would use Radix UI's Popover primitive (already in the project via shadcn/ui), which handles focus trapping, keyboard navigation, and outside-click natively.

3. **refetchInterval on unreadCount**: The `NotificationBell` component polls `unreadCount` every 30 seconds as a fallback alongside SSE. This is a good resilience pattern but could be made conditional (only poll when SSE is disconnected) to reduce unnecessary requests.

4. **`useFactory` type change to `any[]`**: The `ResendModuleAsyncOptions.useFactory` parameter was changed from `unknown[]` to `any[]` with an eslint-disable comment. This was necessary to fix a pre-existing TypeScript build error where NestJS DI injects `ConfigService` (not `unknown`). The eslint-disable is properly scoped to the single line. Acceptable for this NestJS dynamic module pattern.

---

## Checklist

- [x] Functional requirements verified
- [x] Code quality (DRY, KISS) verified
- [x] Architectural compliance verified
- [x] Test quality and coverage verified
- [x] Error handling reviewed
- [x] Performance impact assessed
- [x] tRPC inputs validated with Zod schemas
- [x] Prisma queries use select/include deliberately
- [x] No N+1 queries
- [x] List endpoints are paginated
- [x] New feature follows the feature-folder pattern
- [x] SSE events emitted for real-time-relevant mutations
- [x] httpOnly cookie auth not bypassed
- [x] No `any` types in new code (only in auto-generated @generated/index.ts and pre-existing resend module)
- [x] Shared types/schemas in packages/shared when used by both apps
- [x] Server Components used by default, "use client" only when needed

---

## Verdict

**APPROVED**

The implementation faithfully follows the plan with solid security practices (JWT cookie auth on SSE, notification ownership validation on markAsRead), comprehensive test coverage (20 new + 5 modified tests), clean separation of concerns (generic useSSE hook vs. notification-specific hook), and proper fire-and-forget email handling. The one lint issue found was fixed during review. Minor suggestions are documented above for future iterations.
