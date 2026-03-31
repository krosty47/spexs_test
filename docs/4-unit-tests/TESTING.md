# Testing Guidelines

## Test Frameworks

| App      | Framework            | Runner | Purpose                  |
| -------- | -------------------- | ------ | ------------------------ |
| Backend  | Jest                 | pnpm   | Unit + Integration tests |
| Frontend | Vitest + Testing Lib | pnpm   | Component + Hook tests   |
| E2E      | Playwright           | pnpm   | Full user flows          |

## Running Tests

```bash
# All tests (via Turborepo)
pnpm test

# Backend tests
pnpm --filter backend test
pnpm --filter backend test:watch
pnpm --filter backend test:cov

# Frontend tests
pnpm --filter frontend test
pnpm --filter frontend test:watch

# Single test file
pnpm --filter backend test -- workflows.service.spec.ts

# E2E tests
pnpm --filter frontend e2e
pnpm --filter frontend e2e -- --headed   # with browser UI
```

## Test Organization

### Backend

- Co-located with source: `*.spec.ts` next to the file it tests
- Integration tests: `apps/backend/test/` directory
- Each feature module has its own service spec

```
src/features/workflows/
├── workflows.service.ts
├── workflows.service.spec.ts   # ← co-located unit test
└── ...
```

### Frontend

- Co-located with source: `*.test.tsx` / `*.test.ts`
- E2E tests: `apps/frontend/e2e/` directory

```
src/features/workflows/
├── workflow-card.component.tsx
├── workflow-card.test.tsx       # ← co-located component test
└── ...
```

## Writing Tests

### Backend Service Tests

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

  it('should create a workflow', async () => {
    const dto = { name: 'Test', conditions: [] };
    prisma.workflow.create.mockResolvedValue(mockWorkflow);
    const result = await service.create(dto);
    expect(result.name).toBe('Test');
  });
});
```

### Frontend Component Tests

```tsx
import { render, screen } from '@testing-library/react';

describe('WorkflowCard', () => {
  it('renders workflow name', () => {
    render(<WorkflowCard workflow={mockWorkflow} onEdit={vi.fn()} />);
    expect(screen.getByText('My Workflow')).toBeInTheDocument();
  });
});
```

### Test Naming Convention

- Describe block: class/component name
- It blocks: `should [expected behavior] when [condition]`

## Coverage Requirements

- Backend services: aim for **80%+** line coverage
- Frontend: focus on **critical user paths**, not coverage numbers
- E2E: cover **happy paths** for core features (workflow CRUD, event lifecycle, auth flow)

## What to Test (Priority Order)

### Backend

1. Service business logic (validations, transformations, edge cases)
2. Error scenarios (not found, duplicates, unauthorized)
3. Transaction correctness (multi-model writes)
4. Guard/middleware behavior

### Frontend

1. Component rendering with different props/states
2. User interactions (clicks, form submissions)
3. Error/loading/empty states
4. Hook logic (custom hooks with complex state)

## What NOT to Test

- Prisma queries directly (trust the ORM)
- tRPC wiring (integration tests cover this)
- Third-party library internals
- Pure UI styling (use visual regression if needed)
