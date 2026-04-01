'use client';

import { trpc } from '@/lib/trpc';
import { WorkflowCard } from './workflow-card.component';
import type { Workflow } from './workflow.types';

export function WorkflowList() {
  const utils = trpc.useUtils();
  const workflowsQuery = trpc.workflows.findAll.useQuery({
    page: 1,
    limit: 20,
  });

  const toggleMutation = trpc.workflows.toggleActive.useMutation({
    onSuccess: () => utils.workflows.findAll.invalidate(),
  });

  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => utils.workflows.findAll.invalidate(),
  });

  if (workflowsQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Loading workflows...</p>;
  }

  if (workflowsQuery.error) {
    return <p className="text-[var(--destructive)]">Error: {workflowsQuery.error.message}</p>;
  }

  const workflows: Workflow[] = workflowsQuery.data?.data ?? [];

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
