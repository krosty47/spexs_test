# Changelog Table

| Version | Week | Commit Message                                                                                                            |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `0.7.0` | 1    | feat: full-stack audit & hardening — Redis removal, security hardening, type safety, architecture, error handling, XSS    |
| `0.6.0` | 1    | feat: Nodemailer SMTP migration, HTML email templates, user selector, and IN_APP recipient routing                        |
| `0.5.0` | 1    | feat: end-to-end type safety improvements and error handling hardening                             |
| `0.4.0` | 1    | feat: notifications system v0.4.0 - in-app notifications, SSE real-time delivery, email on trigger |
| `0.3.0` | 1    | feat: core domain model refinements, auth hardening, code review fixes                             |
| `0.2.0` | 1    | feat: event trigger enhancements, snooze expiration cron, frontend pagination                      |
| `0.1.0` | 1    | chore: initialize TRIP workflow                                                                    |

# Changelog Summary

- **v0.7.0 (Full-Stack Audit & Hardening - Week 1, 02-04-2026)**:
  - **Infra**: Removed unused Redis from docker-compose, env files, and env validation
  - **Backend**: 1MB body limit, Helmet CSP (disabled in dev), comma-separated CORS origins
  - **Backend**: In-memory rate limiter tRPC middleware on auth endpoints (5 req/60s per IP)
  - **Backend**: Extracted UsersService from UsersRouter (thin-router fix)
  - **Backend**: GlobalExceptionFilter enhanced with NestJS Logger + production stack trace stripping
  - **Backend**: Removed `[key: string]: unknown` from tRPC AppContextType
  - **Shared**: addCommentSchema sanitization (trim + HTML strip + post-transform validation)
  - **Frontend**: Removed inline type annotations (types inferred from tRPC queries)
  - **Tests**: 148 backend tests pass (17 new: rate limiter, exception filter, users service, schema sanitization)
- **v0.6.0 (Nodemailer & User Selector - Week 1, 02-04-2026)**:
  - **Backend**: Migrated from Resend (API-key) to Nodemailer (SMTP). Graceful degradation when SMTP unconfigured.
  - **Backend**: HTML email templates (event triggered, resolved, snoozed, daily summary) with shared baseLayout
  - **Backend**: `config.getFeatures` endpoint exposes `emailEnabled` flag, `users.list` returns filtered user list
  - **Backend**: IN_APP recipients now receive notifications by user ID (previously unused), deduplicated with workflow owner
  - **Backend**: MailerModule DRY refactor, ConfigRouter protected by AuthMiddleware
  - **Frontend**: EMAIL option conditionally rendered, user selector dropdown for recipient destination
  - **Shared**: `appConfigOutputSchema`, `userListItemSchema`, `userListOutputSchema`
  - **Tests**: 130 backend tests pass, updated IN_APP mock destinations to user IDs
- **v0.5.0 (Type Safety & Error Handling - Week 1, 02-04-2026)**:
  - **Shared**: Zod output schemas for all 21 tRPC procedures (workflows, events, auth, notifications)
  - **Shared**: Split workflowOutputSchema into strict base + workflowWithCountSchema + workflowDetailOutputSchema
  - **Shared**: z.record(z.unknown()) for payload fields, z.coerce.date() for all date fields
  - **Backend**: `output` field on all @Query/@Mutation decorators for runtime output validation
  - **Backend**: ResendEmailService throws TRPCError instead of generic Error, removed unsafe type cast on recipients
  - **Backend**: Updated @generated/index.ts placeholder with output schemas for frontend type inference
  - **Frontend**: inferRouterOutputs<AppRouter> utility (trpc-types.ts), deleted manual workflow.types.ts
  - **Frontend**: ErrorBoundary component with retry, Toaster (sonner) with global tRPC onError handler
  - **Frontend**: Dashboard layout wrapped with ErrorBoundary + Toaster
  - **Tests**: 127 backend tests pass (20 output schema + 4 resend error + 4 ErrorBoundary tests added)
- **v0.4.0 (Notifications System - Week 1, 02-04-2026)**:
  - **Backend**: Notification model + NotificationType enum, user-scoped SSE via Map<userId, Subject[]>, NotificationsService.send() facade (persist + SSE)
  - **Backend**: tRPC notifications router (list, unreadCount, markAsRead, markAllAsRead), JwtCookieGuard extracted to auth feature
  - **Backend**: Event trigger creates in-app notification for workflow owner, fire-and-forget email via ResendEmailService
  - **Backend**: markAsRead optimized to single updateMany, Prisma typed where clauses, JWT payload validation in guard
  - **Frontend**: NotificationBell (Radix Popover) + NotificationDropdown with unread badge, relative timestamps, mark-as-read
  - **Frontend**: Generic useSSE hook (SSR-safe, native auto-reconnect) + useNotifications wrapper with tRPC invalidation
  - **Frontend**: Dashboard header visible on all screen sizes with notification bell
  - **Database**: Notification model with composite [userId, isRead] index, 4 seed notifications
  - **Shared**: Zod schemas for notification types, metadata, list input, mark-as-read (cuid validation)
  - **Tests**: 102 backend tests pass (20 notification + 5 event trigger tests added)
- **v0.3.0 (Core Domain Model v0.3.0 - Week 1, 02-04-2026)**:
  - **Backend**: JWT expiration 15m → 1h, explicit auth guards on routers, daily summary skip-when-unconfigured
  - **Backend**: EventHistory.action converted to Prisma enum, template vars standardized to {{metric}}/{{value}}
  - **Backend**: Resend module typed config, escapeHtml in daily summary, Promise.allSettled in batch send
  - **Frontend**: Next.js Middleware proactive token refresh (replaces client-side interceptor), trpc.ts simplified
  - **Frontend**: Trash icon buttons, metric datalist, two-step snooze confirmation, back arrow on event detail
  - **Frontend**: React Query invalidation on snooze/resolve, StatusBadge extraction, code quality fixes
  - **Database**: EventAction Prisma enum, seed data with {{metric}}/{{value}} template vars
  - **Shared**: eventActionSchema, recipientSchema, triggerConfigSchema exports
  - **Tests**: All 77 backend tests pass, daily summary skip test added
- **v0.2.0 (Day 4 Features - Week 1, 01-04-2026)**:
  - **Backend**: Event trigger validates workflow active status, creates TRIGGERED history, notifies on trigger
  - **Backend**: Snooze expiration cron (every 5 min) reopens expired snoozed events
  - **Frontend**: Event list pagination (15 items/page, sticky controls), mobile-responsive event detail
  - **Frontend**: Workflow `/new` route fix, removed `any` types
  - **Database**: Snooze `until` index, 25 additional seed events for pagination testing
- **v0.1.0 (TRIP Initialization - Week 1, 31-03-2026)**:
  - **Setup**: Initialized TRIP workflow with docs structure
  - **Documentation**: Generated ARCHI.md with Full-Stack Web (Monorepo) architecture
  - **Files Added**: docs/ARCHI.md, docs/ARCHI-rules.md, docs/BEST-PRACTICES.md, docs/TRIP-config.md, docs/2-changelog/changelog_table.md, docs/4-unit-tests/TESTING.md
