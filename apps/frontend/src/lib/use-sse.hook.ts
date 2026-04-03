'use client';

import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Whether to send credentials (cookies) with the request */
  withCredentials?: boolean;
  /** Callback when a message is received */
  onMessage?: (event: MessageEvent) => void;
  /** Comma-separated named SSE event types to listen for (in addition to the default 'message' event) */
  eventTypes?: string;
  /** Whether the SSE connection is enabled */
  enabled?: boolean;
}

interface UseSSEReturn {
  /** Whether the EventSource is currently connected */
  isConnected: boolean;
  /** The current readyState of the EventSource */
  readyState: number;
}

/**
 * Generic reusable SSE hook.
 * Manages EventSource lifecycle: connect, auto-reconnect (native), cleanup.
 * Any feature can use this for any SSE endpoint.
 */
export function useSSE({
  url,
  withCredentials = false,
  onMessage,
  eventTypes = '',
  enabled = true,
}: UseSSEOptions): UseSSEReturn {
  const [readyState, setReadyState] = useState<number>(2); // CLOSED
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setReadyState(2);
      return;
    }

    const eventSource = new EventSource(url, { withCredentials });

    const handler = (event: MessageEvent) => {
      onMessageRef.current?.(event);
    };

    eventSource.onopen = () => {
      setReadyState(1);
    };

    // Listen for default (unnamed) messages
    eventSource.onmessage = handler;

    // Listen for named event types (SSE events sent with `event: <type>`)
    const types = eventTypes ? eventTypes.split(',') : [];
    for (const type of types) {
      eventSource.addEventListener(type, handler);
    }

    eventSource.onerror = () => {
      setReadyState(eventSource.readyState);
      // Native EventSource auto-reconnects (~3s default).
      // Only log; no custom backoff needed.
      console.warn('[useSSE] Connection error, browser will auto-reconnect');
    };

    setReadyState(eventSource.readyState);

    return () => {
      for (const type of types) {
        eventSource.removeEventListener(type, handler);
      }
      eventSource.close();
      setReadyState(2);
    };
  }, [url, withCredentials, enabled, eventTypes]);

  return {
    isConnected: readyState === 1,
    readyState,
  };
}
