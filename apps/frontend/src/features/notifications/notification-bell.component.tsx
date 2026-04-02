'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationDropdown } from './notification-dropdown.component';
import { useNotifications } from './use-notifications.hook';

/**
 * Bell icon with red unread count badge. Clicking opens a Popover with notifications.
 */
export const NotificationBell = (): React.ReactNode => {
  const [open, setOpen] = useState(false);
  const { isConnected } = useNotifications();

  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    // Only poll when SSE is disconnected; when connected, SSE invalidation handles it
    refetchInterval: isConnected ? false : 30_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-md p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
        >
          {/* Bell SVG icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>

          {/* Red unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <NotificationDropdown onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
