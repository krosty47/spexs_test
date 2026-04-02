'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { PaginatedTable } from '@/components/paginated-table.component';
import { StatusBadge } from '@/components/status-badge.component';
import { Card, CardContent } from '@/components/ui/card';
import { TableCell, TableRow } from '@/components/ui/table';
import Link from 'next/link';

type EventStatus = 'OPEN' | 'RESOLVED' | 'SNOOZED';

const STATUS_OPTIONS: Array<{ label: string; value: EventStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Snoozed', value: 'SNOOZED' },
];

interface HistoryEvent {
  id: string;
  title: string;
  status: string;
  createdAt: string | Date;
  workflow: { id: string; name: string };
}

export function HistoryList() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [workflowFilter, setWorkflowFilter] = useState<string | undefined>(undefined);
  const limit = 20;
  const utils = trpc.useUtils();

  const workflowsQuery = trpc.workflows.findAll.useQuery({ page: 1, limit: 100 });

  const eventsQuery = trpc.events.findAll.useQuery({
    pagination: { page, limit },
    filters: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(workflowFilter ? { workflowId: workflowFilter } : {}),
    },
  });

  const resolveMutation = trpc.events.resolve.useMutation({
    onSuccess: () => {
      utils.events.findAll.invalidate();
    },
  });

  const totalPages = eventsQuery.data?.totalPages ?? 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Workflow filter */}
        <select
          className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
          value={workflowFilter ?? ''}
          onChange={(e) => {
            setWorkflowFilter(e.target.value || undefined);
            setPage(1);
          }}
        >
          <option value="">All Workflows</option>
          {workflowsQuery.data?.data.map((wf: { id: string; name: string }) => (
            <option key={wf.id} value={wf.id}>
              {wf.name}
            </option>
          ))}
        </select>
      </div>

      {eventsQuery.isLoading && (
        <p className="text-[var(--muted-foreground)]">Loading history...</p>
      )}

      {eventsQuery.error && (
        <p className="text-[var(--destructive)]">Error: {eventsQuery.error.message}</p>
      )}

      {eventsQuery.data && (
        <PaginatedTable
          columns={['Title', 'Workflow', 'Status', 'Created', 'Actions']}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          desktopRows={eventsQuery.data.data.map((event: HistoryEvent) => (
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
              <TableCell>
                {event.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveMutation.mutate({ id: event.id })}
                    disabled={resolveMutation.isPending}
                  >
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          mobileCards={eventsQuery.data.data.map((event: HistoryEvent) => (
            <Card key={event.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/events/${event.id}`}>
                      <p className="truncate font-medium hover:underline">{event.title}</p>
                    </Link>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {event.workflow?.name ?? 'Unknown'}
                    </p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                  {event.status === 'OPEN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveMutation.mutate({ id: event.id })}
                      disabled={resolveMutation.isPending}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        />
      )}
    </div>
  );
}
