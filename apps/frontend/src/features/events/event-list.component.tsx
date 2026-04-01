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
      variant={
        status === 'OPEN' ? 'destructive' : status === 'RESOLVED' ? 'default' : 'secondary'
      }
    >
      {status}
    </Badge>
  );
}

export function EventList() {
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | 'SNOOZED' | undefined>(
    undefined,
  );

  const eventsQuery = trpc.events.findAll.useQuery({
    pagination: { page: 1, limit: 20 },
    filters: statusFilter ? { status: statusFilter } : undefined,
  });

  if (eventsQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Loading events...</p>;
  }

  if (eventsQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {eventsQuery.error.message}</p>;
  }

  const events = eventsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.label}
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No events found</p>
      ) : (
        <>
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {events.map((event: any) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(event as { workflow?: { name: string } }).workflow?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>{new Date(event.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {(event as { _count?: { comments: number } })._count?.comments ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {events.map((event: any) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {(event as { workflow?: { name: string } }).workflow?.name ?? 'Unknown'}
                        </p>
                      </div>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                      <span>
                        {(event as { _count?: { comments: number } })._count?.comments ?? 0} comments
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
