import { z } from 'zod';

// --- Trigger Configuration Schemas ---

export const triggerOperatorSchema = z.enum(['>', '<', '>=', '<=', '==', '!=']);
export type TriggerOperator = z.infer<typeof triggerOperatorSchema>;

export const thresholdConfigSchema = z.object({
  type: z.literal('THRESHOLD'),
  metric: z.string().min(1, 'Metric name is required'),
  operator: triggerOperatorSchema,
  value: z.number(),
});
export type ThresholdConfig = z.infer<typeof thresholdConfigSchema>;

export const varianceConfigSchema = z.object({
  type: z.literal('VARIANCE'),
  baseValue: z.number(),
  deviationPercentage: z.number().min(0),
});
export type VarianceConfig = z.infer<typeof varianceConfigSchema>;

export const triggerConfigSchema = z.discriminatedUnion('type', [
  thresholdConfigSchema,
  varianceConfigSchema,
]);
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;

// --- Recipient Schema ---

export const recipientChannelSchema = z.enum(['IN_APP', 'EMAIL']);
export type RecipientChannel = z.infer<typeof recipientChannelSchema>;

export const recipientSchema = z.object({
  channel: recipientChannelSchema,
  destination: z.string().min(1, 'Destination is required'),
});
export type Recipient = z.infer<typeof recipientSchema>;

// --- Workflow CRUD Schemas ---

export const createWorkflowSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(false),
  triggerType: z.enum(['THRESHOLD', 'VARIANCE']).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  outputMessage: z.string().max(1000).optional(),
  recipients: z.array(recipientSchema).default([]),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  triggerType: z.enum(['THRESHOLD', 'VARIANCE']).optional().nullable(),
  triggerConfig: triggerConfigSchema.optional().nullable(),
  outputMessage: z.string().max(1000).optional().nullable(),
  recipients: z.array(recipientSchema).optional(),
});

export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

export const workflowIdSchema = z.object({
  id: z.string().min(1),
});

export type WorkflowIdInput = z.infer<typeof workflowIdSchema>;

// --- Simulation Schema ---

export const simulateWorkflowSchema = z.object({
  id: z.string().min(1),
  metricValue: z.number(),
  dryRun: z.boolean().default(false),
});

export type SimulateWorkflowInput = z.infer<typeof simulateWorkflowSchema>;

export interface SimulateWorkflowResult {
  triggered: boolean;
  message: string;
  details: string;
  dryRun: boolean;
  alreadyOpen?: boolean;
}

// --- Output Schemas (tRPC procedure return shapes) ---

/** Base workflow fields returned by create, update, toggleActive, delete */
export const workflowOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  triggerType: z.enum(['THRESHOLD', 'VARIANCE']).nullable(),
  triggerConfig: triggerConfigSchema.nullable(),
  outputMessage: z.string().nullable(),
  recipients: z.array(recipientSchema).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
});

export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;

const embeddedEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  payload: z.record(z.unknown()),
  status: z.enum(['OPEN', 'RESOLVED', 'SNOOZED']),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  workflowId: z.string(),
  resolvedAt: z.coerce.date().nullable(),
  resolvedById: z.string().nullable(),
});

/** Workflow with event count (used in list items) */
export const workflowWithCountSchema = workflowOutputSchema.extend({
  _count: z.object({ events: z.number() }),
});

export type WorkflowWithCount = z.infer<typeof workflowWithCountSchema>;

/** Paginated workflow list returned by findAll */
export const workflowListOutputSchema = z.object({
  data: z.array(workflowWithCountSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type WorkflowListOutput = z.infer<typeof workflowListOutputSchema>;

/** Workflow detail returned by findOne (with events and _count) */
export const workflowDetailOutputSchema = workflowOutputSchema.extend({
  _count: z.object({ events: z.number() }),
  events: z.array(embeddedEventSchema),
});

export type WorkflowDetailOutput = z.infer<typeof workflowDetailOutputSchema>;

/** Simulation result output schema */
export const simulateWorkflowOutputSchema = z.object({
  triggered: z.boolean(),
  message: z.string(),
  details: z.string(),
  dryRun: z.boolean(),
  alreadyOpen: z.boolean().optional(),
});

export type SimulateWorkflowOutput = z.infer<typeof simulateWorkflowOutputSchema>;
