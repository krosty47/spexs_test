import { Injectable, Logger } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/services/mailer.service';
import { eventTriggeredTemplate } from '../mailer/templates';
import {
  parseRecipients,
  type TriggerEventInput,
  type SnoozeEventInput,
  type PaginationInput,
  type EventFilterInput,
} from '@workflow-manager/shared';

@Injectable()
export class EventsService {
  static readonly SYSTEM_USER_ID = 'system';
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailerService: MailerService,
  ) {}

  async findAll(pagination: PaginationInput, filters?: EventFilterInput) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: Prisma.EventWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        snooze: true,
        history: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Event ${id} not found`,
      });
    }

    return event;
  }

  async trigger(input: TriggerEventInput, triggeredBy?: string) {
    const userId = triggeredBy ?? EventsService.SYSTEM_USER_ID;

    // Validate workflow exists and is active, include recipients and owner for notifications
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: input.workflowId },
      select: {
        id: true,
        isActive: true,
        name: true,
        recipients: true,
        userId: true,
        user: { select: { email: true } },
      },
    });

    if (!workflow) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Workflow ${input.workflowId} not found`,
      });
    }

    if (!workflow.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workflow is not active',
      });
    }

    // Wrap event creation + history in a transaction
    const event = await this.prisma.$transaction(async (tx) => {
      // Deduplication check: no duplicate OPEN events for the same workflow
      const existingOpen = await tx.event.findFirst({
        where: {
          workflowId: input.workflowId,
          status: 'OPEN',
        },
      });

      if (existingOpen) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An open event already exists for this workflow',
        });
      }

      const created = await tx.event.create({
        data: {
          title: input.title,
          payload: input.payload as Prisma.InputJsonValue,
          workflowId: input.workflowId,
        },
      });

      await tx.eventHistory.create({
        data: {
          action: 'TRIGGERED',
          eventId: created.id,
          userId,
        },
      });

      return created;
    });

    // Parse recipients from workflow
    const recipients = parseRecipients(workflow.recipients);

    // Notify via SSE after successful transaction (backward-compatible)
    this.notificationsService.notify(userId, 'event.triggered', {
      eventId: event.id,
      title: event.title,
      workflowId: event.workflowId,
    });

    // Send in-app notifications to workflow owner + IN_APP recipients
    const inAppRecipientIds = recipients
      .filter((r) => r.channel === 'IN_APP')
      .map((r) => r.destination);
    const notifyUserIds = new Set([workflow.userId, ...inAppRecipientIds]);

    await Promise.all(
      [...notifyUserIds].map((uid) =>
        this.notificationsService.send({
          userId: uid,
          type: 'EVENT_TRIGGERED',
          title: `Event triggered: ${event.title}`,
          body: `Workflow "${workflow.name}" triggered a new event.`,
          metadata: { eventId: event.id, workflowId: event.workflowId },
        }),
      ),
    );

    // Send emails to EMAIL channel recipients + workflow owner (fire-and-forget)
    const emailDestinations = new Set(
      recipients.filter((r) => r.channel === 'EMAIL').map((r) => r.destination),
    );
    // Always include workflow owner's email
    if (workflow.user?.email) {
      emailDestinations.add(workflow.user.email);
    }

    if (emailDestinations.size > 0) {
      const html = eventTriggeredTemplate({
        eventTitle: event.title,
        workflowName: workflow.name,
        triggeredAt: event.createdAt,
        payload: input.payload as Record<string, unknown> | undefined,
      });

      Promise.allSettled(
        [...emailDestinations].map((to) =>
          this.mailerService.send({
            to,
            subject: `Alert: ${event.title}`,
            html,
          }),
        ),
      ).catch((err) => {
        this.logger.error('Unexpected error sending notification emails', err);
      });
    }

    return event;
  }

  async resolve(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id } });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event ${id} not found`,
        });
      }

      const resolved = await tx.event.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedById: userId,
        },
      });

      await tx.eventHistory.create({
        data: {
          action: 'RESOLVED',
          eventId: id,
          userId,
        },
      });

      return resolved;
    });
  }

  async snooze(id: string, input: SnoozeEventInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id } });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Event ${id} not found`,
        });
      }

      const snoozed = await tx.event.update({
        where: { id },
        data: { status: 'SNOOZED' },
      });

      await tx.snooze.create({
        data: {
          until: input.until,
          reason: input.reason,
          eventId: id,
          userId,
        },
      });

      await tx.eventHistory.create({
        data: {
          action: 'SNOOZED',
          eventId: id,
          userId,
        },
      });

      return snoozed;
    });
  }

  async addComment(eventId: string, content: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Event ${eventId} not found`,
      });
    }

    return this.prisma.comment.create({
      data: {
        content,
        eventId,
        userId,
      },
    });
  }
}
