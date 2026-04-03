import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

import type { AppRouter } from '@workflow-manager/backend/generated';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Exhaustive namespace list derived from AppRouter.
 * If a new router is added to AppRouter, TypeScript will error here
 * until it is added to ALL_NAMESPACES (and optionally SKIP_INVALIDATION).
 */
export type TrpcNamespace = keyof AppRouter['_def']['record'];
const ALL_NAMESPACES = ['workflows', 'events', 'notifications', 'config', 'users', 'auth'] as const;
type _ExhaustiveCheck =
  Exclude<TrpcNamespace, (typeof ALL_NAMESPACES)[number]> extends never
    ? true
    : {
        error: 'ALL_NAMESPACES is missing router keys';
        missing: Exclude<TrpcNamespace, (typeof ALL_NAMESPACES)[number]>;
      };
const _: _ExhaustiveCheck = true;

const SKIP_INVALIDATION: readonly TrpcNamespace[] = ['auth'];
export const INVALIDATE_NAMESPACES = ALL_NAMESPACES.filter(
  (ns): ns is Exclude<TrpcNamespace, 'auth'> => !SKIP_INVALIDATION.includes(ns),
);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${BACKEND_URL}/trpc`,
        fetch(url, options) {
          return fetch(url, { ...options, credentials: 'include' });
        },
      }),
    ],
  });
}
