import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@workflow-manager/backend/generated';

/** Full map of all tRPC router outputs, inferred from the AppRouter type */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// --- Convenience type aliases for frequently used types ---

/** Single workflow (from findOne) */
export type Workflow = RouterOutputs['workflows']['findOne'];

/** Paginated workflow list (from findAll) */
export type WorkflowListResponse = RouterOutputs['workflows']['findAll'];

/** Workflow item in list (includes _count) */
export type WorkflowListItem = WorkflowListResponse['data'][number];

/** Simulation result */
export type SimulateResult = RouterOutputs['workflows']['simulate'];

/** Single event */
export type Event = RouterOutputs['events']['findOne'];

/** Paginated event list */
export type EventListResponse = RouterOutputs['events']['findAll'];

/** Event item in list */
export type EventListItem = EventListResponse['data'][number];

/** Auth response (login/register) */
export type AuthResponse = RouterOutputs['auth']['login'];

/** Current user from context */
export type CurrentUser = RouterOutputs['auth']['me'];
