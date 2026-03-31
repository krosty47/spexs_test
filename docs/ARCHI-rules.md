# Architecture Documentation Rules

[ARCHI.md](ARCHI.md) documents the Workflow Manager architecture. After each
task (new feature, refactor, bug fix), determine if ARCHI.md needs updating.

## When to Update

Update after ANY change that alters:

- Project structure (new directories, moved files)
- Technology stack (new dependencies, version changes)
- API Design (new routers, changed procedures)
- Database Layer (new models, schema changes, migration patterns)
- Authentication & Authorization (auth flow changes, new guards)
- Real-Time Architecture (new WebSocket events, changed subscription patterns)
- Notifications System (new channels, changed delivery logic)
- Background Jobs (new cron jobs, queue changes)
- Components & UI Architecture (new shared components, pattern changes)
- State Management (new stores, changed data flow)
- Routing (new routes, changed route groups)
- Data flow or component interactions
- Build or deployment processes

## How to Update by Change Type

### Major Feature / Refactor

Review: Overview, Project Structure, API Design, Database Layer, Data Flow Diagrams, and any section related to the feature domain (e.g., Real-Time Architecture for WebSocket features, Notifications System for new channels).

### Minor Feature / Enhancement

Update: Project Structure (if new files/folders), API Design (if new endpoints), and the relevant domain section.

### Bug Fix

Usually no update needed, unless it reveals/fixes an architectural flaw documented in ARCHI.md.

### Dependency Changes

Update: Technology Stack, and any affected architectural sections (e.g., switching from Resend to SendGrid affects Notifications System).

### New External Module

Update: Project Structure (new module in `src/modules/`), and add a note in the relevant section if it introduces a new integration pattern.

### Database Schema Changes

Update: Database Layer (Core Models section), and Data Flow Diagrams if relationships changed.

## Guidelines

- Be precise and factual — reflect the actual codebase
- Be concise — enough detail to understand, not implementation specifics
- Update diagrams when data flow changes
- Reference actual file paths
- Keep the Technology Stack table current with versions
- When adding a new section, place it logically between existing sections
