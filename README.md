# Workflow Manager

A full-stack alert workflow management application. Create workflows that monitor metrics (threshold or variance), trigger events when conditions are met, and notify users in real-time via in-app alerts and email.

| Layer    | Stack                                               |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 15, React 19, tRPC, shadcn/ui, Tailwind CSS |
| Backend  | NestJS 10, Fastify, tRPC, Passport JWT              |
| Database | PostgreSQL 16, Prisma ORM                           |
| Tooling  | pnpm workspaces, Turborepo, TypeScript 5            |

---

## Quick Start

> **Prerequisites:** [Node.js 24+](https://nodejs.org/), [pnpm 9+](https://pnpm.io/installation), [Docker](https://docs.docker.com/get-docker/)

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env → set JWT_SECRET and JWT_REFRESH_SECRET (32+ characters each)

# 3. Start PostgreSQL + Mailpit
docker-compose up -d

# 4. Set up the database
pnpm db:generate && pnpm db:push && pnpm db:seed

# 5. Start the app
pnpm dev
```

Once running, open **http://localhost:3000** in your browser.

| Service  | URL                   | Description                               |
| -------- | --------------------- | ----------------------------------------- |
| Frontend | http://localhost:3000 | Web application                           |
| Backend  | http://localhost:4000 | API server                                |
| Mailpit  | http://localhost:8025 | Email inbox (catches all outbound emails) |

---

## Test Credentials

| Email               | Password        | Role  |
| ------------------- | --------------- | ----- |
| `admin@spexs.dev`   | `password12345` | Admin |
| `support@spexs.dev` | `password12345` | User  |

---

## Manual Testing Guide

The seed creates 16 workflows, 25 events, notifications, comments, and snooze records so you can explore every feature immediately. Below is a walkthrough covering all major functionality.

### 1. Authentication

1. Go to http://localhost:3000 — you'll be redirected to `/login`
2. Log in with `admin@spexs.dev` / `password12345`
3. You should land on the **Workflows** page
4. Open DevTools → Application → Cookies — verify `access_token` and `refresh_token` are **httpOnly**
5. Log out (top-right menu) — cookies are cleared, you're redirected to `/login`
6. Try the **Register** page to create a new account

> Auth endpoints are rate-limited to 5 requests per 60 seconds per IP.

### 2. Workflows — Browse & Create

1. The **Workflows** page lists all workflows with pagination
2. Click **New Workflow** to create one:

   **Threshold example** — triggers when a metric crosses a value:
   - Name: `High CPU Usage`
   - Trigger type: **Threshold**
   - Metric: `cpu_usage`, Operator: `>`, Value: `90`
   - Output message: `CPU usage hit {{value}}% on {{metric}}`
   - Add recipients: pick an in-app user and/or type an email address

   **Variance example** — triggers on deviation from a baseline:
   - Name: `Traffic Anomaly`
   - Trigger type: **Variance**
   - Base value: `1000`, Deviation: `50` (%)
   - Output message: `Traffic deviated: {{value}} vs baseline {{metric}}`

3. Save and verify the workflow appears in the list
4. Click a workflow to view its details, edit fields, or toggle **Active/Inactive**

### 3. Simulate & Trigger Events

1. Open any **active** workflow's detail page
2. Use the **Simulate** button with a metric value:
   - For a threshold workflow with `cpu_usage > 90`, enter `95` — it should trigger
   - Try `85` — it should not trigger
3. **Dry run** tests the condition without creating an event
4. **Actual trigger** creates an event and sends notifications
5. Verify the new event appears in the **Events** page

> **Deduplication:** If an event is already OPEN for that workflow, a second trigger returns a conflict — no duplicate events.

### 4. Events — Lifecycle Management

Navigate to the **Events** page to see all events. Use the filters to narrow by **status** (Open / Resolved / Snoozed) or by **workflow**.

**Resolve an event:**

1. Click an open event to see its details
2. Click **Resolve** — the status changes and a notification is sent

**Snooze an event:**

1. Click an open event
2. Click **Snooze** and pick a duration/time
3. The event status changes to SNOOZED
4. When the snooze expires, the event automatically reopens (via cron job every 15 minutes + precise setTimeout)

**Add a comment:**

1. Open any event's detail page
2. Write a comment in the text field and submit
3. The comment appears in the event's timeline
4. Try entering `<script>alert('xss')</script>` — HTML tags are stripped (XSS protection)

### 5. Notifications — Real-Time Updates

1. Look at the **bell icon** in the top-right header — it shows an unread count badge
2. Trigger an event (step 3 above) and watch the bell update **in real-time** via SSE
3. Click the bell to open the notification dropdown
4. Click individual notifications to mark them as read, or use **Mark all as read**
5. Click a notification to navigate to the related event

> Open a **second browser tab** logged in as the other user to see cross-user notifications when both are set as recipients.

### 6. Email Notifications

1. Open **Mailpit** at http://localhost:8025
2. Trigger, resolve, or snooze an event on a workflow that has **email recipients**
3. Check Mailpit — you should see the corresponding email with an HTML template
4. Emails are sent for: event triggered, resolved, snoozed, and reopened

> If `SMTP_HOST` is not configured, email sending is gracefully skipped (no errors).

### 7. History & Audit Trail

1. Open any event's detail page
2. The **history section** shows a timeline of all actions: Created, Triggered, Resolved, Snoozed, Reopened
3. Each entry includes the timestamp and the user who performed the action
4. The **Events** list page supports pagination and combined filters (status + workflow)

### 8. Multi-User Scenario

To test the full real-time experience:

1. Open **Browser A** → log in as `admin@spexs.dev`
2. Open **Browser B** (incognito or different browser) → log in as `support@spexs.dev`
3. In Browser A, create a workflow with `support@spexs.dev` as an in-app recipient
4. Trigger an event on that workflow
5. In Browser B, the notification bell should update in real-time (no page refresh needed)

---

## Project Structure

```
.
├── apps/
│   ├── backend/          # NestJS + Fastify + tRPC API
│   └── frontend/         # Next.js + React + shadcn/ui
├── packages/
│   ├── prisma/           # Prisma schema, migrations, seed
│   └── shared/           # Shared Zod schemas and types
├── docs/
│   ├── ARCHI.md          # Architecture documentation
│   ├── 1-plans/          # Feature planning docs
│   ├── 2-changelog/      # Version changelogs (v0.1.0 → v0.7.0)
│   ├── 3-code-review/    # Code review records
│   └── 4-unit-tests/     # Testing guidelines
├── docker-compose.yml    # PostgreSQL + Mailpit
├── turbo.json            # Turborepo pipeline
└── pnpm-workspace.yaml   # Workspace definition
```

## Available Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all packages and apps        |
| `pnpm lint`        | Lint all packages                  |
| `pnpm format`      | Format code with Prettier          |
| `pnpm test`        | Run all tests (148 tests)          |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:seed`     | Seed the database                  |
| `pnpm db:migrate`  | Run Prisma migrations              |
| `pnpm db:fresh`    | Reset DB and re-seed               |

## Environment Variables

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable                  | Description                        | Default                 |
| ------------------------- | ---------------------------------- | ----------------------- |
| `DATABASE_URL`            | PostgreSQL connection string       | (see .env.example)      |
| `JWT_SECRET`              | Access token signing key (32+ ch)  | —                       |
| `JWT_REFRESH_SECRET`      | Refresh token signing key (32+ ch) | —                       |
| `SMTP_HOST`               | SMTP server hostname               | `localhost`             |
| `SMTP_PORT`               | SMTP server port                   | `1025`                  |
| `CORS_ORIGIN`             | Allowed frontend origin            | `http://localhost:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for the frontend       | `http://localhost:4000` |
| `SNOOZE_CRON`             | Snooze expiration check interval   | `*/15 * * * *`          |

## Version

Current version: **0.7.0** — See [changelog](docs/2-changelog/w1_v0.7.0.md) for details.
