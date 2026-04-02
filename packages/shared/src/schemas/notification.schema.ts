import { z } from 'zod';

// Notification type enum matching Prisma NotificationType
export const notificationTypeSchema = z.enum([
  'EVENT_TRIGGERED',
  'EVENT_RESOLVED',
  'EVENT_SNOOZED',
  'EVENT_REOPENED',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

// Typed metadata shape enforced at the application layer
export const notificationMetadataSchema = z.object({
  eventId: z.string(),
  workflowId: z.string(),
});

export type NotificationMetadata = z.infer<typeof notificationMetadataSchema>;

// Full notification object shape (for API responses)
export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  metadata: notificationMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

// Mark single notification as read
export const markNotificationReadSchema = z.object({
  id: z.string().cuid(),
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;

// Notification list input with pagination and optional unread filter
export const notificationListSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  unreadOnly: z.boolean().optional(),
});

export type NotificationListInput = z.infer<typeof notificationListSchema>;

// Unread count output
export const unreadCountOutputSchema = z.object({
  count: z.number().int().min(0),
});

export type UnreadCountOutput = z.infer<typeof unreadCountOutputSchema>;
