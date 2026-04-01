'use client';

import { EventList } from '@/features/events';

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Events</h2>
        <p className="text-sm text-[var(--muted-foreground)]">View and manage triggered events</p>
      </div>
      <EventList />
    </div>
  );
}
