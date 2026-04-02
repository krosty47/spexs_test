import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  SimulateWorkflowResult,
  TriggerConfig,
  Recipient,
} from '@workflow-manager/shared';

export type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  SimulateWorkflowResult,
  TriggerConfig,
  Recipient,
};

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: 'THRESHOLD' | 'VARIANCE' | null;
  triggerConfig: TriggerConfig | null;
  outputMessage: string | null;
  recipients: Recipient[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  _count?: {
    events: number;
  };
}
