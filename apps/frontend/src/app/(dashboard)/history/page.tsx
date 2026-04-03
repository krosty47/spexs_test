'use client';

import { HistoryList } from '@/features/history';
import { CONTENT_PADDING_X } from '@/lib/utils';

export default function HistoryPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={`pt-4 pb-4 sm:pt-6 ${CONTENT_PADDING_X}`}>
        <h2 className="text-2xl font-bold">Event History</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Complete history of all events</p>
      </div>
      <HistoryList />
    </div>
  );
}
