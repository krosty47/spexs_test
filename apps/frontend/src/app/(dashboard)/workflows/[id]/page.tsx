'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge.component';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Bell,
  Mail,
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { SimulateTrigger } from '@/features/workflows/simulate-trigger.component';
import { WorkflowForm } from '@/features/workflows/workflow-form.component';
import { Skeleton } from '@/components/ui/skeleton';
import { triggerConfigSchema, recipientSchema } from '@workflow-manager/shared';
import { z } from 'zod';

const SKELETON_2 = Array.from({ length: 2 });
const SKELETON_3 = Array.from({ length: 3 });

function WorkflowDetailSkeleton() {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* Trigger Config card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </CardContent>
      </Card>

      {/* Recipients card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-2">
          {SKELETON_2.map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border p-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Events card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="space-y-2">
          {SKELETON_3.map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const workflowQuery = trpc.workflows.findOne.useQuery({ id: params.id });
  const toggleMutation = trpc.workflows.toggleActive.useMutation();
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      router.push('/workflows');
    },
  });

  if (workflowQuery.isLoading) {
    return <WorkflowDetailSkeleton />;
  }

  if (workflowQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {workflowQuery.error.message}</p>;
  }

  const workflow = workflowQuery.data;
  if (!workflow) return null;

  const hasTriggerConfig = !!workflow.triggerConfig;
  const parsedTriggerConfig = triggerConfigSchema.safeParse(workflow.triggerConfig);
  const validTriggerConfig = parsedTriggerConfig.success ? parsedTriggerConfig.data : undefined;
  const recipients = z
    .array(recipientSchema)
    .catch([])
    .parse(workflow.recipients ?? []);

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-8 w-8 shrink-0"
            onClick={() => router.push('/workflows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{workflow.name}</h2>
              <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="text-xs">
                {workflow.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {workflow.description && (
              <p className="mt-1 text-[var(--muted-foreground)]">{workflow.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? (
              <>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: workflow.id })}>
                {workflow.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--destructive)]"
                onClick={() => deleteMutation.mutate({ id: workflow.id })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isEditing ? (
        <WorkflowForm
          initialData={{
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            isActive: workflow.isActive,
            triggerType: validTriggerConfig?.type,
            triggerConfig: validTriggerConfig,
            outputMessage: workflow.outputMessage,
            recipients: z
              .array(recipientSchema)
              .catch([])
              .parse(workflow.recipients ?? []),
          }}
        />
      ) : (
        <>
          {/* Trigger Config Summary */}
          {hasTriggerConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Trigger Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-[var(--muted)] p-4 text-sm">
                  {JSON.stringify(workflow.triggerConfig, null, 2)}
                </pre>
                {workflow.outputMessage && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Message template:</span> {workflow.outputMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Simulate Trigger */}
          {hasTriggerConfig && (
            <SimulateTrigger workflowId={workflow.id} isActive={workflow.isActive} />
          )}

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>Users notified when this workflow triggers</CardDescription>
            </CardHeader>
            <CardContent>
              {recipients.length > 0 ? (
                <div className="space-y-2">
                  {recipients.map((recipient) => (
                    <div
                      key={`${recipient.channel}-${recipient.destination}`}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      {recipient.channel === 'EMAIL' ? (
                        <Mail className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      ) : (
                        <Bell className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{recipient.destination}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {recipient.channel === 'EMAIL' ? 'Email' : 'In-App'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No additional recipients. Only the workflow owner receives notifications.
                </p>
              )}
            </CardContent>
          </Card>

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
                            <StatusBadge status={event.status} />
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
        </>
      )}
    </div>
  );
}
