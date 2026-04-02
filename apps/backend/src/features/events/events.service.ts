import { Injectable, Logger } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResendEmailService } from '../resend/services/resend-email.service';
import {
  recipientSchema,
  type TriggerEventInput,
  type SnoozeEventInput,
  type PaginationInput,
  type EventFilterInput,
} from '@workflow-manager/shared';
import { z } from 'zod';

@Injectable()
export class EventsService {
  static readonly SYSTEM_USER_ID = 'system';
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly resendEmailService: ResendEmailService,
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
      select: { id: true, isActive: true, name: true, recipients: true, userId: true },
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

    // Notify via SSE after successful transaction (backward-compatible)
    this.notificationsService.notify(userId, 'event.triggered', {
      eventId: event.id,
      title: event.title,
      workflowId: event.workflowId,
    });

    // Create in-app notification for workflow owner
    await this.notificationsService.send({
      userId: workflow.userId,
      type: 'EVENT_TRIGGERED',
      title: `Event triggered: ${event.title}`,
      body: `Workflow "${workflow.name}" triggered a new event.`,
      metadata: { eventId: event.id, workflowId: event.workflowId },
    });

    // Send emails to EMAIL channel recipients (fire-and-forget)
    const parsed = z.array(recipientSchema).safeParse(workflow.recipients ?? []);
    const recipients = parsed.success ? parsed.data : [];
    const emailRecipients = recipients.filter((r) => r.channel === 'EMAIL');

    if (emailRecipients.length > 0) {
      Promise.allSettled(
        emailRecipients.map((r) =>
          this.resendEmailService.send({
            to: r.destination,
            subject: `Alert: ${event.title}`,
            html: `<h2>${event.title}</h2><p>Workflow "${workflow.name}" triggered a new event.</p>`,
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
