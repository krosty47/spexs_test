'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' as const },
  { label: 'Resolved', value: 'RESOLVED' as const },
  { label: 'Snoozed', value: 'SNOOZED' as const },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === 'OPEN' ? 'destructive' : status === 'RESOLVED' ? 'default' : 'secondary'}
    >
      {status}
    </Badge>
  );
}

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
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 pb-4">
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
        <p className="text-[var(--muted-foreground)]">No events found</p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
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
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {events.map((event) => (
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
            </div>
          </div>

          {/* Pagination controls — fixed at bottom */}
          {totalPages > 1 && (
            <div className="sticky bottom-0 flex items-center justify-center gap-4 border-t bg-[var(--background)] py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--muted-foreground)]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
