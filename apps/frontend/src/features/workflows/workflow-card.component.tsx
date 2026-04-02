'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Power, PowerOff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Workflow } from './workflow.types';

interface WorkflowCardProps {
  workflow: Workflow;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WorkflowCard({ workflow, onToggle, onDelete }: WorkflowCardProps) {
  const router = useRouter();
  const eventCount = workflow._count?.events ?? 0;

  return (
    <Card
      className="relative flex cursor-pointer flex-col transition-shadow hover:shadow-md"
      onClick={() => router.push(`/workflows/${workflow.id}`)}
    >
      {/* Kebab menu — top right */}
      <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggle(workflow.id)}>
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
              onClick={() => onDelete(workflow.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pb-3 pr-12">
        <CardTitle className="text-base leading-snug">{workflow.name}</CardTitle>
        {workflow.description && (
          <CardDescription className="line-clamp-2 text-sm">{workflow.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="text-xs">
            {workflow.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {workflow.triggerType && (
            <Badge variant="outline" className="text-xs">
              {workflow.triggerType === 'THRESHOLD' ? 'Threshold' : 'Variance'}
            </Badge>
          )}
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
    </Card>
  );
}
