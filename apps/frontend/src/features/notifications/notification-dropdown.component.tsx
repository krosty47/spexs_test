'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { notificationMetadataSchema } from '@workflow-manager/shared';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata: unknown;
  createdAt: string | Date;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

/**
 * Format a Date as relative time (e.g., "5 minutes ago").
 */
function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

/**
 * Scrollable notification list with mark-as-read, mark-all-as-read, and empty state.
 */
export const NotificationDropdown = ({ onClose }: NotificationDropdownProps): React.ReactNode => {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notifications.list.useQuery({
    page: 1,
    limit: 10,
    unreadOnly: false,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const notifications: NotificationItem[] = data?.data ?? [];

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending}
        >
          Mark all read
        </Button>
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
            Loading...
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
            No notifications yet
          </div>
        )}

        {notifications.map((notification) => {
          const parsed = notificationMetadataSchema.safeParse(notification.metadata);
          const metadata = parsed.success ? parsed.data : null;

          return (
            <button
              key={notification.id}
              className={cn(
                'flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]',
                !notification.isRead && 'bg-[var(--accent)]/30',
              )}
              onClick={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification.id);
                }
                if (metadata?.eventId) {
                  router.push(`/events/${metadata.eventId}`);
                  onClose();
                }
              }}
            >
              <div className="flex items-start gap-2">
                {/* Unread indicator */}
                {!notification.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm',
                      !notification.isRead ? 'font-semibold' : 'font-normal',
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {notification.body}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
