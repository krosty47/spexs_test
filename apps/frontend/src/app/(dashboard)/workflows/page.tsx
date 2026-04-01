'use client';

import { Button } from '@/components/ui/button';
import { WorkflowList } from '@/features/workflows';
import Link from 'next/link';

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflows</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your alert workflows and automations
          </p>
        </div>
        <Link href="/workflows/new">
          <Button className="w-full sm:w-auto">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Create Workflow
          </Button>
        </Link>
      </div>
      <WorkflowList />
    </div>
  );
}
