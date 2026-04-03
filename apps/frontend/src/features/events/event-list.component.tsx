'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { PaginatedTable } from '@/components/paginated-table.component';
import { StatusBadge } from '@/components/status-badge.component';
import { TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { CONTENT_PADDING_X } from '@/lib/utils';

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' as const },
  { label: 'Resolved', value: 'RESOLVED' as const },
  { label: 'Snoozed', value: 'SNOOZED' as const },
];

export function EventList() {
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | 'SNOOZED' | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);

  const eventsQuery = trpc.events.findAll.useQuery({
    pagination: { page, limit: 15 },
    filters: statusFilter ? { status: statusFilter } : undefined,
  });

  if (eventsQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Loading events...</p>;
  }

  if (eventsQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {eventsQuery.error.message}</p>;
  }

  const events: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string | Date;
    workflowId: string;
    workflow?: { id: string; name: string } | null;
    _count?: { comments: number } | null;
  }> = eventsQuery.data?.data ?? [];
  const totalPages = eventsQuery.data?.totalPages ?? 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex flex-wrap gap-2 pb-4 ${CONTENT_PADDING_X}`}>
        {statusFilters.map((filter) => (
          <Button
            key={filter.label}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <p className={`text-[var(--muted-foreground)] ${CONTENT_PADDING_X}`}>No events found</p>
      ) : (
        <PaginatedTable
          columns={['Title', 'Workflow', 'Status', 'Created', 'Comments']}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          desktopRows={events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                  {event.title}
                </Link>
              </TableCell>
              <TableCell>{event.workflow?.name ?? 'Unknown'}</TableCell>
              <TableCell>
                <StatusBadge status={event.status} />
              </TableCell>
              <TableCell>{new Date(event.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>{event._count?.comments ?? 0}</TableCell>
            </TableRow>
          ))}
          mobileCards={events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {event.workflow?.name ?? 'Unknown'}
                      </p>
                    </div>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                    <span>{event._count?.comments ?? 0} comments</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        />
      )}
    </div>
  );
}
