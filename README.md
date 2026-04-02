# Workflow Manager

A full-stack alert workflow management app built with a pnpm monorepo.

| Layer    | Stack                                               |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 15, React 19, tRPC, shadcn/ui, Tailwind CSS |
| Backend  | NestJS 10, Fastify, tRPC, Passport JWT              |
| Database | PostgreSQL 16, Prisma ORM                           |
| Cache    | Redis 7                                             |
| Tooling  | pnpm workspaces, Turborepo, TypeScript 5            |

## Prerequisites

- [Node.js 24+](https://nodejs.org/) (see `.nvmrc`)
- [pnpm 9+](https://pnpm.io/installation)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd spexs-test
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your own JWT secrets (minimum 32 characters each):

```
JWT_SECRET=<your-secret-here>
JWT_REFRESH_SECRET=<your-refresh-secret-here>
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

| Service    | Port |
| ---------- | ---- |
| PostgreSQL | 5433 |
| Redis      | 6380 |

### 4. Set up the database

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Apply schema to database
pnpm db:seed       # Seed sample data
```

### 5. Start development servers

```bash
pnpm dev
```

This starts both apps concurrently via Turborepo:

| App      | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:4000 |

The notification bell in the top-right header shows real-time alerts via SSE. Click it to view, mark as read, or navigate to event details.

### 6. Log in

Use one of the seeded accounts:

| Email              | Password      | Role  |
| ------------------ | ------------- | ----- |
| admin@workflow.dev | password12345 | Admin |
| user@workflow.dev  | password12345 | User  |

## Project Structure

```
.
├── apps/
│   ├── backend/          # NestJS + Fastify + tRPC API
│   └── frontend/         # Next.js + React + shadcn/ui
├── packages/
│   ├── prisma/           # Prisma schema, migrations, seed
│   └── shared/           # Shared Zod schemas and types
├── docker-compose.yml    # PostgreSQL + Redis
├── turbo.json            # Turborepo pipeline config
└── pnpm-workspace.yaml   # Workspace definition
```

## Available Scripts

Run these from the project root:

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all packages and apps        |
| `pnpm lint`        | Lint all packages                  |
| `pnpm format`      | Format code with Prettier          |
| `pnpm test`        | Run tests                          |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:seed`     | Seed the database                  |
| `pnpm db:migrate`  | Run Prisma migrations              |

## Environment Variables

See [`.env.example`](.env.example) for all available variables:

| Variable                  | Description                        | Default                  |
| ------------------------- | ---------------------------------- | ------------------------ |
| `DATABASE_URL`            | PostgreSQL connection string       | (see .env.example)       |
| `JWT_SECRET`              | Access token signing key (32+ ch)  | -                        |
| `JWT_REFRESH_SECRET`      | Refresh token signing key (32+ ch) | -                        |
| `JWT_EXPIRATION`          | Access token TTL                   | `15m`                    |
| `REDIS_URL`               | Redis connection string            | `redis://localhost:6380` |
| `REDIS_PASSWORD`          | Redis authentication password      | `redisdevpass`           |
| `CORS_ORIGIN`             | Allowed frontend origin            | `http://localhost:3000`  |
| `PORT`                    | Backend port                       | `4000`                   |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for the frontend       | `http://localhost:4000`  |

## Version

Current version: **0.5.0** — See [changelog](docs/2-changelog/w1_v0.5.0.md) for details.
