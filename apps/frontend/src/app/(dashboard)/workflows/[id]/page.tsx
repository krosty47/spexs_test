'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const workflowQuery = trpc.workflows.findOne.useQuery({ id: params.id });
  const toggleMutation = trpc.workflows.toggleActive.useMutation({
    onSuccess: () => {
      utils.workflows.findOne.invalidate({ id: params.id });
    },
  });
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => router.push('/workflows'),
  });

  if (workflowQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Loading...</p>;
  }

  if (workflowQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {workflowQuery.error.message}</p>;
  }

  const workflow = workflowQuery.data;
  if (!workflow) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{workflow.name}</h2>
          {workflow.description && (
            <p className="text-[var(--muted-foreground)]">{workflow.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
            {workflow.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate({ id: workflow.id })}
          >
            {workflow.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate({ id: workflow.id })}
          >
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>{workflow._count?.events ?? 0} total events</CardDescription>
        </CardHeader>
        <CardContent>
          {workflow.events && workflow.events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflow.events.map(
                  (event: {
                    id: string;
                    title: string;
                    status: string;
                    createdAt: string | Date;
                  }) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Link href={`/events/${event.id}`} className="hover:underline">
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.status === 'OPEN'
                              ? 'destructive'
                              : event.status === 'RESOLVED'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(event.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          ) : (
            <p className="text-[var(--muted-foreground)]">No events yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
