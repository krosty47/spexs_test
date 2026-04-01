import type { CreateWorkflowInput, UpdateWorkflowInput } from '@workflow-manager/shared';

export type { CreateWorkflowInput, UpdateWorkflowInput };

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  _count?: {
    events: number;
  };
}
