import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

import type { AppRouter } from '@workflow-manager/backend/generated';

export const trpc = createTRPCReact<AppRouter>();

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
