'use client';

import { useCallback } from 'react';
import { useSSE } from '@/lib/use-sse.hook';
import { trpc } from '@/lib/trpc';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface UseNotificationsOptions {
  /** Whether to enable the SSE connection */
  enabled?: boolean;
}

/**
 * Notification-specific hook that wraps useSSE for /notifications/sse.
 * Invalidates tRPC notification queries on each SSE message for immediate UI updates.
 */
export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
  const utils = trpc.useUtils();

  const onMessage = useCallback(() => {
    // Invalidate notification queries so React Query refetches fresh data
    void utils.notifications.unreadCount.invalidate();
    void utils.notifications.list.invalidate();
  }, [utils]);

  const { isConnected, readyState } = useSSE({
    url: `${BACKEND_URL}/notifications/sse`,
    withCredentials: true,
    enabled,
    onMessage,
  });

  return { isConnected, readyState };
}
