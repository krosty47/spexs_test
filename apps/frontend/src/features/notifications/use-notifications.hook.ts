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
// Named SSE event types sent by the backend (stable string avoids useSSE reconnects)
const SSE_EVENT_TYPES_KEY =
  'notification.created,event.triggered,event.resolved,event.snoozed,event.reopened';

export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
  const utils = trpc.useUtils();

  const onMessage = useCallback(
    (event: MessageEvent) => {
      // Always refresh notification badge and list
      void utils.notifications.unreadCount.invalidate();
      void utils.notifications.list.invalidate();

      // Refresh event tables and workflow detail for status-change events
      if (event.type.startsWith('event.')) {
        void utils.events.findAll.invalidate();
        void utils.events.findOne.invalidate();
        void utils.workflows.findAll.invalidate();

        // Scope workflow detail invalidation to the affected workflow
        try {
          const data = JSON.parse(event.data);
          if (data?.workflowId) {
            void utils.workflows.findOne.invalidate({ id: data.workflowId });
          } else {
            void utils.workflows.findOne.invalidate();
          }
        } catch {
          void utils.workflows.findOne.invalidate();
        }
      }
    },
    [utils],
  );

  const { isConnected, readyState } = useSSE({
    url: `${BACKEND_URL}/notifications/sse`,
    withCredentials: true,
    enabled,
    onMessage,
    eventTypes: SSE_EVENT_TYPES_KEY,
  });

  return { isConnected, readyState };
}
