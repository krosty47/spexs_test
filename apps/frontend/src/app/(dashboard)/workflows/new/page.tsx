'use client';

import { WorkflowForm } from '@/features/workflows';

export default function NewWorkflowPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create Workflow</h2>
      <WorkflowForm />
    </div>
  );
}
