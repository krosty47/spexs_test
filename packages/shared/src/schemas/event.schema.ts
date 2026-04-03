import { z } from 'zod';

export const eventActionSchema = z.enum([
  'CREATED',
  'TRIGGERED',
  'RESOLVED',
  'SNOOZED',
  'REOPENED',
]);
export type EventAction = z.infer<typeof eventActionSchema>;

export const triggerEventSchema = z.object({
  title: z.string().min(3).max(200),
  payload: z.record(z.unknown()).default({}),
  workflowId: z.string().cuid(),
});

export type TriggerEventInput = z.infer<typeof triggerEventSchema>;

export const resolveEventSchema = z.object({
  id: z.string().cuid(),
});

export type ResolveEventInput = z.infer<typeof resolveEventSchema>;

export const snoozeEventSchema = z.object({
  id: z.string().cuid(),
  until: z.coerce.date(),
  reason: z.string().max(500).optional(),
});

export type SnoozeEventInput = z.infer<typeof snoozeEventSchema>;

export const addCommentSchema = z.object({
  eventId: z.string().cuid(),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000)
    .transform((val) => val.replace(/<[^>]*>/g, ''))
    .pipe(z.string().min(1, 'Comment cannot be empty')),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const eventIdSchema = z.object({
  id: z.string().cuid(),
});

export type EventIdInput = z.infer<typeof eventIdSchema>;

export const eventFilterSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'SNOOZED']).optional(),
  workflowId: z.string().cuid().optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

// --- Output Schemas (tRPC procedure return shapes) ---

/** Single event shape returned by trigger, resolve, snooze */
export const eventOutputSchema = z.object({
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

export type EventOutput = z.infer<typeof eventOutputSchema>;

/** Event with workflow name and comment count (used in list items) */
export const eventWithWorkflowSchema = eventOutputSchema.extend({
  workflow: z.object({ id: z.string(), name: z.string() }),
  _count: z.object({ comments: z.number() }),
});

export type EventWithWorkflow = z.infer<typeof eventWithWorkflowSchema>;

/** Paginated event list returned by findAll */
export const eventListOutputSchema = z.object({
  data: z.array(eventWithWorkflowSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type EventListOutput = z.infer<typeof eventListOutputSchema>;

/** Comment with user info */
export const commentOutputSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventId: z.string(),
  userId: z.string(),
  user: z.object({ id: z.string(), name: z.string() }),
});

export type CommentOutput = z.infer<typeof commentOutputSchema>;

/** Snooze details */
export const snoozeOutputSchema = z.object({
  id: z.string(),
  until: z.coerce.date(),
  reason: z.string().nullable(),
  createdAt: z.coerce.date(),
  eventId: z.string(),
  userId: z.string(),
});

export type SnoozeOutput = z.infer<typeof snoozeOutputSchema>;

/** Event history entry with user info */
export const eventHistoryOutputSchema = z.object({
  id: z.string(),
  action: eventActionSchema,
  createdAt: z.coerce.date(),
  eventId: z.string(),
  userId: z.string(),
  user: z.object({ id: z.string(), name: z.string() }),
});

export type EventHistoryOutput = z.infer<typeof eventHistoryOutputSchema>;

/** Event detail returned by findOne (with comments, snooze, history) */
export const eventDetailOutputSchema = eventOutputSchema.extend({
  workflow: z.object({ id: z.string(), name: z.string() }),
  comments: z.array(commentOutputSchema),
  snooze: snoozeOutputSchema.nullable(),
  history: z.array(eventHistoryOutputSchema),
});

export type EventDetailOutput = z.infer<typeof eventDetailOutputSchema>;

/**
 * Comment returned by addComment — differs from commentOutputSchema because
 * Prisma.comment.create() returns the raw row without the `user` relation.
 * The full commentOutputSchema (with nested user) is used in eventDetailOutputSchema.
 */
export const addCommentOutputSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventId: z.string(),
  userId: z.string(),
});

export type AddCommentOutput = z.infer<typeof addCommentOutputSchema>;
