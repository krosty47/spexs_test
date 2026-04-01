# Changelog Table

| Version | Week | Commit Message                                                                |
| ------- | ---- | ----------------------------------------------------------------------------- |
| `0.2.0` | 1    | feat: event trigger enhancements, snooze expiration cron, frontend pagination |
| `0.1.0` | 1    | chore: initialize TRIP workflow                                               |

# Changelog Summary

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
