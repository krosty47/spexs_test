'use client';

import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
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

export default function HistoryPage() {
  const eventsQuery = trpc.events.findAll.useQuery({
    pagination: { page: 1, limit: 50 },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event History</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Complete history of all events</p>
      </div>

      {eventsQuery.isLoading && (
        <p className="text-[var(--muted-foreground)]">Loading history...</p>
      )}

      {eventsQuery.error && (
        <p className="text-[var(--destructive)]">Error: {eventsQuery.error.message}</p>
      )}

      {eventsQuery.data && (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {eventsQuery.data.data.map((event: any) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {eventsQuery.data.data.map((event: any) => (
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
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
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
