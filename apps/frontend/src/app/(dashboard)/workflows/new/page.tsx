'use client';

import { WorkflowForm } from '@/features/workflows';

export default function NewWorkflowPage() {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
      <h2 className="text-2xl font-bold">Create Workflow</h2>
      <WorkflowForm />
    </div>
  );
}
