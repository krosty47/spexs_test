'use client';

import { HistoryList } from '@/features/history';

export default function HistoryPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">Event History</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Complete history of all events</p>
      </div>
      <HistoryList />
    </div>
  );
}
