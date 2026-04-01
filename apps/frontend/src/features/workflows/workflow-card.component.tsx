'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import type { Workflow } from './workflow.types';

interface WorkflowCardProps {
  workflow: Workflow;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WorkflowCard({ workflow, onToggle, onDelete }: WorkflowCardProps) {
  const eventCount = workflow._count?.events ?? 0;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            <Link href={`/workflows/${workflow.id}`} className="hover:underline">
              {workflow.name}
            </Link>
          </CardTitle>
          <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="shrink-0 text-xs">
            {workflow.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {workflow.description && (
          <CardDescription className="line-clamp-2 text-sm">{workflow.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m16 12-4-4-4 4" />
              <path d="M12 16V8" />
            </svg>
            {eventCount} {eventCount === 1 ? 'event' : 'events'}
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onToggle(workflow.id)}
        >
          {workflow.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => onDelete(workflow.id)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
