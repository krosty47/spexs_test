# Workflow Manager - Best Practices

> Stack-specific patterns and conventions for this project.
> For universal principles (SOLID, DRY, KISS), see the coding standards enforced during code review (TRIP-3).

---

## 1. NestJS + Fastify

### Module Organization

Use **feature-based modules**. Each domain feature is a complete NestJS module (`@Module()`) containing its service, DTOs, and tRPC router.

```
src/features/workflows/
├── workflows.module.ts
├── workflows.service.ts
├── workflows.service.spec.ts
├── dto/
│   ├── create-workflow.dto.ts
│   └── update-workflow.dto.ts
└── schemas/                    # Zod schemas for tRPC input
    └── workflow.schemas.ts
```

**Key rules:**
- `@Global()` sparingly — only for database, config, and auth modules
- Export only what other modules need; keep internals private
- Each feature module can be moved or extracted independently

### Thin Routers (tRPC)

tRPC routers must only: validate input (Zod), delegate to services, return results.

```typescript
// ✅ Thin router — no logic
@Router()
export class WorkflowRouter {
  constructor(private readonly workflowService: WorkflowService) {}

  @Query()
  findAll(@Input() input: PaginationSchema) {
    return this.workflowService.findAll(input);
  }

  @Mutation()
  create(@Input() input: CreateWorkflowSchema) {
    return this.workflowService.create(input);
  }
}

// ❌ Fat router — logic belongs in service
@Mutation()
create(@Input() input: CreateWorkflowSchema) {
  const existing = await this.prisma.workflow.findFirst({ where: { name: input.name } });
  if (existing) throw new TRPCError({ code: 'CONFLICT' });
  // ... more logic
}
```

### Dependency Injection

- Always use constructor injection with `private readonly`
- Use custom injection tokens for abstractions (external services)
- Default scope is `SINGLETON` — use `REQUEST` scope only when truly needed
- Avoid circular dependencies — refactor if `forwardRef` is needed

```typescript
@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}
}
```

### Request Lifecycle (NestJS)

```
Request → Middleware → Guards → Interceptors (pre) → Pipes → Handler → Interceptors (post) → Exception Filters → Response
```

Apply logic at the right layer:
- **Middleware**: Logging, correlation IDs
- **Guards**: JWT verification, role checks
- **Interceptors**: Response transformation, timing
- **Pipes**: Input validation (handled by tRPC + Zod in this project)
- **Exception Filters**: Error formatting, structured logging

### Guards

```typescript
// JWT guard reads from httpOnly cookie
@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.access_token;
    if (!token) return false;
    request.user = this.jwtService.verify(token);
    return true;
  }
}

// Apply globally via APP_GUARD, bypass with @Public()
export const Public = () => SetMetadata('isPublic', true);
```

### Error Handling

- Use tRPC error codes for API errors (`TRPCError` with `code`)
- Use NestJS exceptions for internal service errors
- Global exception filter for unhandled errors
- Never use bare `throw new Error()` — always include context

```typescript
// ✅ tRPC-aware errors in services
throw new TRPCError({
  code: 'NOT_FOUND',
  message: `Workflow ${id} not found`,
});

throw new TRPCError({
  code: 'CONFLICT',
  message: 'An open event already exists for this workflow',
});
```

### Configuration

```typescript
// Validate env vars at startup with Zod
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  RESEND_API_KEY: z.string().optional(),
});

// Fail fast if invalid
const env = envSchema.parse(process.env);
```

---

## 2. tRPC v11 + nestjs-trpc

### Router Conventions

- One router per feature (maps 1:1 to NestJS feature modules)
- Merge all routers in `app.router.ts`
- Use Zod schemas for all inputs — never trust raw input

```typescript
// Define input schemas alongside the router
const createWorkflowSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  conditions: z.array(conditionSchema),
  isActive: z.boolean().default(false),
});

type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
```

### Error Mapping

Map domain errors to tRPC codes consistently:

| Domain Situation          | tRPC Code        |
| ------------------------- | ---------------- |
| Resource not found        | `NOT_FOUND`      |
| Duplicate / conflict      | `CONFLICT`       |
| Validation failure        | `BAD_REQUEST`    |
| Not authenticated         | `UNAUTHORIZED`   |
| Not authorized            | `FORBIDDEN`      |
| Server error              | `INTERNAL_SERVER_ERROR` |

### Middleware

Use tRPC middleware for cross-cutting concerns:

```typescript
// Auth middleware — ensures user is in context
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

---

## 3. Prisma (Database)

### Schema Conventions

- Model names: `PascalCase` singular (`Workflow`, not `Workflows`)
- Field names: `camelCase`
- Use `@map` and `@@map` for snake_case database columns
- Always define `createdAt` and `updatedAt` on every model
- Use enums for fixed sets of values

```prisma
model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(false) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  events Event[]

  @@map("workflows")
}

enum EventStatus {
  OPEN
  RESOLVED
  SNOOZED
}
```

### Query Patterns

```typescript
// ✅ Use select for projection (only fetch what you need)
const workflows = await this.prisma.workflow.findMany({
  select: { id: true, name: true, isActive: true, _count: { select: { events: true } } },
  where: { isActive: true },
  take: 20,
  skip: offset,
});

// ✅ Use include for relations (eager loading)
const event = await this.prisma.event.findUnique({
  where: { id },
  include: { comments: true, snooze: true, workflow: { select: { name: true } } },
});

// ✅ Transactions for multi-model writes
await this.prisma.$transaction(async (tx) => {
  const event = await tx.event.update({ where: { id }, data: { status: 'RESOLVED' } });
  await tx.eventHistory.create({ data: { eventId: id, action: 'RESOLVED', userId } });
  return event;
});
```

### Avoiding N+1

```typescript
// ❌ N+1 — separate query per workflow
const workflows = await this.prisma.workflow.findMany();
for (const w of workflows) {
  w.events = await this.prisma.event.findMany({ where: { workflowId: w.id } });
}

// ✅ Single query with include
const workflows = await this.prisma.workflow.findMany({
  include: { events: { where: { status: 'OPEN' }, take: 5 } },
});
```

### Migrations

- Use `prisma migrate dev` for development (creates + applies)
- Use `prisma migrate deploy` for production (applies only)
- One concern per migration
- Review generated SQL before applying
- Never edit applied migrations

### Seeding

- Seed script in `packages/prisma/seed.ts`
- Use `upsert` for idempotent seeding
- Include realistic sample data for development

---

## 4. Next.js 15 App Router (Frontend)

### Server vs Client Components

```tsx
// Default: Server Component (no directive needed)
// Use for: data fetching, static content, SEO-critical pages
export default async function WorkflowsPage() {
  const workflows = await trpc.workflows.findAll.query();
  return <WorkflowList workflows={workflows} />;
}

// Client Component: only when interactivity is needed
"use client";
export const WorkflowFilter = ({ onFilter }: Props): ReactNode => {
  const [search, setSearch] = useState('');
  // ...
};
```

### When to use `"use client"`

- Form interactions (inputs, buttons with state)
- Browser APIs (localStorage, window, etc.)
- Event handlers that modify state
- Hooks (`useState`, `useEffect`, custom hooks)
- Real-time subscriptions (WebSocket)

### Route Organization

- Use route groups `(auth)` and `(dashboard)` for layout separation
- Use `layout.tsx` for shared UI (sidebar, header)
- Use `loading.tsx` for streaming/suspense loading states
- Use `error.tsx` for route-level error boundaries

### tRPC Client Setup

```typescript
// lib/trpc.ts — tRPC client for App Router
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '@workflow-manager/backend';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          // Cookies sent automatically (httpOnly)
        }),
      ],
    };
  },
});
```

---

## 5. React Patterns

### Component Pattern

```tsx
interface Props {
  workflow: Workflow;
  onEdit: (id: string) => void;
}

export const WorkflowCard = ({ workflow, onEdit }: Props): ReactNode => {
  return (
    <Card>
      <CardHeader>{workflow.name}</CardHeader>
      <CardContent>
        <StatusBadge status={workflow.isActive ? 'active' : 'inactive'} />
      </CardContent>
      <CardFooter>
        <Button onClick={() => onEdit(workflow.id)}>Edit</Button>
      </CardFooter>
    </Card>
  );
};
```

### Component Extraction Rules

| Condition             | Threshold                           | Action               |
| --------------------- | ----------------------------------- | -------------------- |
| JSX depth/complexity  | > 3 nested tags or > 10 lines      | Extract component    |
| Props received        | > 2 props being passed down         | Extract component    |
| Logic involved        | Any `.map()`, conditionals          | Extract component    |
| Reusability           | Same JSX pattern 2+ times           | Shared component     |
| Component size        | > 150 lines                         | Split sub-components |
| Logic in component    | > 5 lines of logic                  | Extract to hook      |

### Naming Conventions

- Files: `kebab-case` (e.g., `workflow-card.component.tsx`)
- Components: `PascalCase` (e.g., `WorkflowCard`)
- Hooks: `camelCase` with `use` prefix (e.g., `useWorkflows`)
- File suffixes: `*.component.tsx`, `*.hook.ts`, `*.service.ts`, `*.store.ts`, `*.types.ts`

### Barrel Exports

Every feature directory must have an `index.ts`:

```ts
// features/workflows/index.ts
export { WorkflowCard } from './workflow-card.component';
export { WorkflowForm } from './workflow-form.component';
export { useWorkflowForm } from './use-workflow-form.hook';
export type { WorkflowFormValues } from './workflow.types';
```

### State Management

```
Does only this component use it?
  └─ YES → useState
  └─ NO → Do siblings/parent need it?
            └─ YES → Lift to parent
            └─ NO → Is it server data?
                      └─ YES → tRPC + React Query
                      └─ NO → Zustand store
```

**Key rule**: Never duplicate server state in client stores. tRPC's React Query integration handles caching, refetching, and optimistic updates.

### Props

- Always destructure in function signature
- Provide defaults for optional props
- Avoid prop drilling beyond 2 levels (use composition or Zustand)

### useEffect Rules

- Always clean up subscriptions, timers, listeners
- Never derive state in useEffect — compute directly
- Never suppress the exhaustive-deps linter
- Prefer event handlers over useEffect for user-triggered actions

---

## 6. Zod (Validation)

Zod is the single validation library across the entire stack (replaces class-validator + Yup).

### Shared Schemas

Define schemas in `packages/shared/` when used by both backend and frontend:

```typescript
// packages/shared/src/schemas/workflow.schema.ts
export const createWorkflowSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(false),
  conditions: z.array(conditionSchema).min(1),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
```

### Form Validation (Frontend)

```typescript
// React Hook Form + Zod (via @hookform/resolvers)
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkflowSchema } from '@workflow-manager/shared';

export const useWorkflowForm = () => {
  return useForm<CreateWorkflowInput>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { name: '', isActive: false, conditions: [] },
  });
};
```

### Rules

- Always infer types from Zod schemas (`z.infer<typeof schema>`) — never manually duplicate
- Schemas live as close to usage as possible (shared → `packages/shared/`, backend-only → feature folder)
- Use `.transform()` for data normalization (trim, lowercase emails)
- Use `.refine()` / `.superRefine()` for custom validations

---

## 7. Tailwind CSS + shadcn/ui

### Styling Rules

- **No inline styles** — use Tailwind classes exclusively
- **No CSS modules** — Tailwind covers all styling needs
- Use CSS variables for theming (defined in `globals.css`)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'rounded-lg border p-4',
  isActive ? 'border-green-500 bg-green-50' : 'border-gray-200',
)} />
```

### shadcn/ui Conventions

- Install components as needed (`npx shadcn@latest add button`)
- Customize via CSS variables, not by modifying component source
- Use Radix UI primitives directly for custom components not in shadcn
- Never override Radix's built-in keyboard navigation or ARIA attributes
- Icon-only buttons always need `aria-label`

---

## 8. TypeScript Conventions

- **No `any`** — use `unknown` + type guards, or `Record<string, unknown>` for dynamic data
- **No `React.FC`** — use explicit function signature with Props interface
- Use `type` imports: `import type { User } from './types'`
- Use discriminated unions for state variants
- Use `as const` for literal types and exhaustive checks
- Use `satisfies` for type-safe object literals

```typescript
// ✅ Discriminated union for tRPC result
type QueryResult<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

// ✅ satisfies for type-safe config
const routes = {
  workflows: '/workflows',
  events: '/events',
} satisfies Record<string, string>;
```

### Import Order

```typescript
// 1. React and external libraries
import { useState } from 'react';

// 2. Internal packages (monorepo)
import type { CreateWorkflowInput } from '@workflow-manager/shared';

// 3. Internal features/modules (absolute paths)
import { useAuth } from '@/features/auth';

// 4. Local components and hooks
import { WorkflowCard } from './workflow-card.component';

// 5. Types, constants, enums
import type { Workflow } from './workflow.types';
```

---

## 9. Testing Patterns

### Backend Unit Tests

```typescript
describe('WorkflowService', () => {
  let service: WorkflowService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(WorkflowService);
    prisma = module.get(PrismaService);
  });

  it('should throw NOT_FOUND when workflow does not exist', async () => {
    prisma.workflow.findUnique.mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toThrow(TRPCError);
  });
});
```

### Frontend Component Tests

```tsx
describe('WorkflowCard', () => {
  it('renders workflow name and status', () => {
    render(<WorkflowCard workflow={mockWorkflow} onEdit={vi.fn()} />);
    expect(screen.getByText('My Workflow')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
```

### Test File Naming

- Backend: `*.spec.ts` (co-located with source)
- Frontend: `*.test.tsx` / `*.test.ts` (co-located with source)
- E2E: `e2e/*.spec.ts`

---

## 10. Independent Modules (External APIs)

Modules in `src/modules/` are pure NestJS modules with no tRPC dependency:

```
modules/resend/
├── resend.module.ts
├── resend.service.ts
├── resend.types.ts
└── templates/
```

### Rules

- Only depend on `@nestjs/common` and the external SDK
- Expose a clean service interface (no HTTP/tRPC concerns)
- Inject via NestJS DI into any feature that needs it
- Can be extracted to `packages/` if needed across projects
- Each module handles its own error mapping and retry logic

---

## 11. Security Practices

- Validate all tRPC inputs with Zod — reject malformed data at the boundary
- httpOnly cookies for JWT — never expose tokens to JavaScript
- Use `SameSite=Strict` + `Secure` flags on cookies
- Parameterized queries via Prisma (SQL injection prevention is automatic)
- Never log sensitive data (passwords, tokens, PII)
- Environment variables for all secrets (never hardcode)
- CORS: explicit origin whitelist (never `*` in production)
- Rate limiting on auth endpoints (stricter than general endpoints)
- Sanitize user-generated content (comments) before rendering

---

## 12. Performance Rules

- **Prisma**: Use `select` for projection, `include` deliberately, avoid fetching full rows
- **Pagination**: All list endpoints must be paginated (cursor-based for real-time data)
- **No N+1**: Use `include` or batch queries, never loop + query
- **React Server Components**: Default to server components, use client only for interactivity
- **tRPC batching**: Multiple queries batched in a single HTTP request
- **Database indexes**: On all frequently queried fields (status, timestamps, foreign keys)
- **Lazy loading**: Heavy components via `React.lazy` + `Suspense`
- **WebSocket > Polling**: For real-time updates
