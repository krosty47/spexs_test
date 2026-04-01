import { z } from 'zod';

export const triggerEventSchema = z.object({
  title: z.string().min(3).max(200),
  payload: z.record(z.unknown()).default({}),
  workflowId: z.string().min(1),
});

export type TriggerEventInput = z.infer<typeof triggerEventSchema>;

export const resolveEventSchema = z.object({
  id: z.string().min(1),
});

export type ResolveEventInput = z.infer<typeof resolveEventSchema>;

export const snoozeEventSchema = z.object({
  id: z.string().min(1),
  until: z.coerce.date(),
  reason: z.string().max(500).optional(),
});

export type SnoozeEventInput = z.infer<typeof snoozeEventSchema>;

export const addCommentSchema = z.object({
  eventId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const eventIdSchema = z.object({
  id: z.string().min(1),
});

export type EventIdInput = z.infer<typeof eventIdSchema>;

export const eventFilterSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'SNOOZED']).optional(),
  workflowId: z.string().min(1).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;
