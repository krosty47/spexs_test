import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(false),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

export const workflowIdSchema = z.object({
  id: z.string().min(1),
});

export type WorkflowIdInput = z.infer<typeof workflowIdSchema>;
