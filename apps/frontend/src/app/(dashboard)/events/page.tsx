'use client';

import { EventList } from '@/features/events';
import { CONTENT_PADDING_X } from '@/lib/utils';

export default function EventsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`pt-4 pb-4 sm:pt-6 ${CONTENT_PADDING_X}`}>
        <h2 className="text-2xl font-bold">Events</h2>
        <p className="text-sm text-[var(--muted-foreground)]">View and manage triggered events</p>
      </div>
      <EventList />
    </div>
  );
}
