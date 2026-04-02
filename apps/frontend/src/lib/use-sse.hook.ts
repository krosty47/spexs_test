'use client';

import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Whether to send credentials (cookies) with the request */
  withCredentials?: boolean;
  /** Callback when a message is received */
  onMessage?: (event: MessageEvent) => void;
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

    eventSource.onopen = () => {
      setReadyState(1);
    };

    eventSource.onmessage = (event: MessageEvent) => {
      onMessageRef.current?.(event);
    };

    eventSource.onerror = () => {
      setReadyState(eventSource.readyState);
      // Native EventSource auto-reconnects (~3s default).
      // Only log; no custom backoff needed.
      console.warn('[useSSE] Connection error, browser will auto-reconnect');
    };

    setReadyState(eventSource.readyState);

    return () => {
      eventSource.close();
      setReadyState(2);
    };
  }, [url, withCredentials, enabled]);

  return {
    isConnected: readyState === 1,
    readyState,
  };
}
