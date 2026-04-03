'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications';
import { ErrorBoundary } from '@/components/error-boundary.component';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navItems = [
  { href: '/workflows', label: 'Workflows', icon: '⚡' },
  { href: '/events', label: 'Events', icon: '📋' },
  { href: '/history', label: 'History', icon: '🕐' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push('/login');
    },
    onError: () => {
      toast.error('Failed to log out. Please try again.');
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-[var(--sidebar-background)] transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <h1 className="text-lg font-bold text-[var(--sidebar-foreground)]">Workflow Manager</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] lg:hidden"
          >
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <Separator className="mx-4 my-3" />
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                  : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]',
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info & logout */}
        {user && (
          <div className="shrink-0 border-t px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)]">
                  {user.name}
                </p>
                <p className="truncate text-xs text-[var(--sidebar-foreground)]/60">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-8 w-8 shrink-0 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
                title="Log out"
              >
                <LogoutIcon />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header with notification bell (all screen sizes) */}
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
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
                <path d="M3 12h18" />
                <path d="M3 6h18" />
                <path d="M3 18h18" />
              </svg>
            </Button>
            <span className="font-semibold lg:hidden">Workflow Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user && (
              <div className="flex items-center gap-2 lg:hidden">
                <span className="max-w-[120px] truncate text-sm text-muted-foreground">
                  {user.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="h-8 w-8 shrink-0"
                  title="Log out"
                >
                  <LogoutIcon />
                </Button>
              </div>
            )}
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
