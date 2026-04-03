'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkflowCard } from './workflow-card.component';

const SKELETON_6 = Array.from({ length: 6 });

function WorkflowListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {SKELETON_6.map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader className="pb-3 pr-12">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-1 h-4 w-full" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkflowList() {
  const workflowsQuery = trpc.workflows.findAll.useQuery({
    page: 1,
    limit: 20,
  });

  const toggleMutation = trpc.workflows.toggleActive.useMutation();

  const deleteMutation = trpc.workflows.delete.useMutation();

  if (workflowsQuery.isLoading) {
    return <WorkflowListSkeleton />;
  }

  if (workflowsQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {workflowsQuery.error.message}</p>;
  }

  const workflows = workflowsQuery.data?.data ?? [];

  if (workflows.length === 0) {
    return (
      <p className="text-[var(--muted-foreground)]">No workflows yet. Create your first one.</p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onToggle={(id) => toggleMutation.mutate({ id })}
          onDelete={(id) => deleteMutation.mutate({ id })}
        />
      ))}
    </div>
  );
}
