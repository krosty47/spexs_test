# Code Review: Event Trigger Logic Enhancements (Day 4)

**Review Date**: 2026-04-01
**Version**: 0.2.0
**Files Reviewed**:

- `apps/backend/src/features/events/events.service.ts`
- `apps/backend/src/features/events/events.service.spec.ts`
- `apps/backend/src/features/events/events.router.ts`
- `apps/backend/src/features/events/events.module.ts`
- `apps/backend/src/features/events/snooze-expiration.service.ts`
- `apps/backend/src/features/events/snooze-expiration.service.spec.ts`
- `apps/backend/src/app.module.ts`
- `apps/backend/package.json`
- `apps/frontend/src/features/events/event-list.component.tsx`
- `packages/prisma/schema.prisma`

---

## Executive Summary

NEEDS REVISION -- One critical issue identified: the `EventHistory.userId` field has a foreign key constraint to the `User` table, but both the trigger method and snooze expiration service use `'SYSTEM'` as a userId, which will cause a foreign key violation at runtime. This is an architectural decision that requires orchestrator input.

---

## Changes Overview

This feature increment enhances the event trigger flow with:

1. Workflow active validation before triggering events
2. TRIGGERED history entry creation within a transaction
3. NotificationsService integration for event.triggered and event.reopened
4. New SnoozeExpirationService cron job (every 5 min) to reopen expired snoozes
5. Frontend pagination controls for EventList
6. `@@index([until])` on Snooze model for efficient cron queries
7. `@nestjs/schedule` dependency and ScheduleModule registration

---

## Test Summary

- **Test files**: 5 (2 modified, 1 new for this feature)
- **Test cases**: 38 (38 passed, 0 failed)
- **TDD compliance**: All services and components have tests: Yes
- **Key scenarios covered**:
  - Workflow validation (NOT_FOUND, BAD_REQUEST for inactive)
  - TRIGGERED history entry creation in transaction
  - NotificationsService.notify called after trigger
  - triggeredBy userId passed from auth context
  - Duplicate OPEN event rejection
  - Snooze expiration: reopen events, create REOPENED history, delete snooze record
  - Snooze expiration: notify for each reopened event
  - Snooze expiration: empty result set handled gracefully
  - Snooze expiration: future snoozes not touched (query filter verified)

---

## Findings

### Critical Issues

1. **Foreign key constraint violation with 'SYSTEM' userId** (`events.service.ts:82`, `snooze-expiration.service.ts:49`)
   - `EventHistory.userId` has a `@relation(fields: [userId], references: [id])` to the `User` model
   - Using `'SYSTEM'` as userId will cause a Prisma foreign key constraint error at runtime since no User record with id `'SYSTEM'` exists
   - Affects: `trigger()` method when no triggeredBy is provided, and all snooze expiration history entries
   - **Resolution requires architectural decision** -- see "Issues Requiring Orchestrator Review"

### Major Issues

None

### Minor Issues

1. **Workflow query fetches full row** (`events.service.ts:85-86`) -- `workflow.findUnique({ where: { id } })` fetches all columns when only `isActive` is needed. Should use `select: { id: true, isActive: true }` per BEST-PRACTICES.md Prisma query patterns.

2. **Snooze expiration query fetches full event rows** (`snooze-expiration.service.ts:20-28`) -- Only `id`, `title`, and `workflowId` are used from the event, but the entire row is fetched. Should use `select` to limit projection.

3. **Pre-existing `any` types in EventList** (`event-list.component.tsx:95,121`) -- `events.map((event: any)` with eslint-disable comments. This was pre-existing from Day 1-3, not introduced by this feature, but worth noting for future cleanup.

### Suggestions

1. **Test code duplication** -- The `txMock` setup pattern (creating mock, configuring `$transaction`) is repeated across 5+ trigger tests. Could be extracted to a `setupTransactionMock()` helper function.

2. **Error logging in snooze expiration** -- The service logs success but does not log or handle individual transaction failures. If one event fails, the rest won't be processed. Consider wrapping the for-loop body in try/catch with error logging.

---

## Issues Requiring Orchestrator Review

### 'SYSTEM' userId Foreign Key Violation

The `EventHistory` model has a mandatory foreign key relation to `User`:

```prisma
model EventHistory {
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id])
}
```

Using `'SYSTEM'` as userId will fail at runtime. Possible approaches:

1. **Make userId nullable** -- `userId String?` with optional relation. System-initiated actions would have `null` userId.
2. **Create a system user seed** -- Add a seeded User with id `'SYSTEM'` or a known CUID. Requires seed script update.
3. **Separate field** -- Add a `systemAction Boolean @default(false)` field and make userId optional when systemAction is true.

Each approach has trade-offs. The orchestrator should decide the preferred approach before this can be merged.

---

## Checklist

- [x] Functional requirements verified
- [x] Code quality (DRY, KISS) verified
- [x] Architectural compliance verified
- [x] Test quality and coverage verified
- [x] Error handling reviewed
- [x] Performance impact assessed

---

## Verdict

**NEEDS REVISION**

The implementation is well-structured, follows the plan accurately, and has comprehensive test coverage (38/38 passing). The critical issue is the `'SYSTEM'` userId foreign key violation which will cause runtime failures. Once the orchestrator decides on the approach for system-initiated actions, the fix should be straightforward. The minor issues (missing `select` on Prisma queries) are non-blocking but should be addressed.
