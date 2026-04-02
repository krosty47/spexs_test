import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { NotificationType, NotificationMetadata } from '@workflow-manager/shared';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: NotificationMetadata;
}

/**
 * Notifications service using user-scoped SSE for real-time alert delivery.
 * Maintains a Map<userId, Subject[]> so each user only receives their own events.
 * External services call send() to persist + push notifications.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Map of userId -> array of Subjects (one per SSE connection/tab) */
  private readonly userSubjects = new Map<string, Subject<MessageEvent>[]>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Subscribe to user-specific SSE event stream.
   * Creates a new Subject for the user and returns its observable.
   * On unsubscribe, the Subject is removed from the map.
   */
  subscribe(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Add subject to the user's list
    const subjects = this.userSubjects.get(userId) ?? [];
    subjects.push(subject);
    this.userSubjects.set(userId, subjects);

    // Return observable that cleans up on unsubscribe
    return new Observable<MessageEvent>((subscriber) => {
      const subscription = subject.subscribe(subscriber);

      return () => {
        subscription.unsubscribe();
        subject.complete();

        // Remove this subject from the user's list
        const currentSubjects = this.userSubjects.get(userId);
        if (currentSubjects) {
          const filtered = currentSubjects.filter((s) => s !== subject);
          if (filtered.length === 0) {
            this.userSubjects.delete(userId);
          } else {
            this.userSubjects.set(userId, filtered);
          }
        }
      };
    });
  }

  /**
   * Emit a notification event to a specific user's SSE connections.
   * If the user has no active connections, the event is silently dropped.
   */
  notify(userId: string, event: string, payload: Record<string, unknown>): void {
    const subjects = this.userSubjects.get(userId);
    if (!subjects || subjects.length === 0) {
      return;
    }

    const message: MessageEvent = { type: event, data: payload };
    for (const subject of subjects) {
      subject.next(message);
    }
  }

  /**
   * Public-facing facade: persists notification to DB and pushes SSE event.
   * This is the single method external services should call.
   */
  async send(params: SendNotificationParams): Promise<void> {
    const { userId, type, title, body, metadata } = params;

    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, metadata },
    });

    // Push SSE event (no-op if user is offline)
    this.notify(userId, 'notification.created', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
    });
  }

  /**
   * Paginated list of notifications for a user, with optional unread filter.
   */
  async findAllForUser(
    userId: string,
    pagination: { page: number; limit: number },
    unreadOnly?: boolean,
  ) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: Prisma.NotificationWhereInput = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * Mark a single notification as read. Validates ownership.
   */
  async markAsRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      const existing = await this.prisma.notification.findUnique({ where: { id } });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Notification ${id} not found`,
        });
      }

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Cannot mark another user's notification as read",
      });
    }

    return this.prisma.notification.findUnique({ where: { id } });
  }

  /**
   * Batch mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
