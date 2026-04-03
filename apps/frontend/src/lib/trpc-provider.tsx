'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { trpc, getTrpcClient, INVALIDATE_NAMESPACES } from './trpc';

interface TrpcProviderProps {
  children: React.ReactNode;
}

export function TrpcProvider({ children }: TrpcProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: false,
          },
          mutations: {
            onSuccess: () => {
              for (const ns of INVALIDATE_NAMESPACES) {
                queryClient.invalidateQueries({ queryKey: [[ns]] });
              }
            },
            onError: (error) => {
              toast.error(error.message || 'An unexpected error occurred');
            },
          },
        },
      }),
  );

  const [trpcClient] = useState(() => getTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
