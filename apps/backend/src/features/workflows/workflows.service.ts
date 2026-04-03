import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { EventsService } from '../events/events.service';
import { triggerConfigSchema, parseRecipients } from '@workflow-manager/shared';
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  PaginationInput,
  SimulateWorkflowResult,
  Recipient,
} from '@workflow-manager/shared';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly triggerEvaluation: TriggerEvaluationService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(pagination: PaginationInput) {
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await Promise.all([
      this.prisma.workflow.findMany({
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { events: true } },
        },
      }),
      this.prisma.workflow.count(),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(id: string, currentUser: { id: string; email: string }) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        events: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { events: true } },
      },
    });

    if (!workflow) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Workflow ${id} not found`,
      });
    }

    return {
      ...workflow,
      recipients: this.filterSelfRecipients(workflow.recipients, currentUser),
    };
  }

  async create(input: CreateWorkflowInput, userId: string) {
    return this.prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig ?? undefined,
        outputMessage: input.outputMessage,
        recipients: input.recipients ?? [],
        userId,
      },
    });
  }

  async update(id: string, input: UpdateWorkflowInput) {
    await this.ensureExists(id);

    // Build typed update data, converting null JSON fields to Prisma's DbNull
    const data: Prisma.WorkflowUpdateInput = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.triggerType !== undefined && { triggerType: input.triggerType }),
      ...(input.outputMessage !== undefined && { outputMessage: input.outputMessage }),
    };

    if (input.triggerConfig === null) {
      data.triggerConfig = Prisma.DbNull;
    } else if (input.triggerConfig !== undefined) {
      data.triggerConfig = input.triggerConfig as Prisma.InputJsonValue;
    }

    if (input.recipients !== undefined) {
      data.recipients =
        input.recipients === null ? Prisma.DbNull : (input.recipients as Prisma.InputJsonValue);
    }

    return this.prisma.workflow.update({
      where: { id },
      data,
    });
  }

  async toggleActive(id: string) {
    const workflow = await this.ensureExists(id);

    return this.prisma.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      const eventIds = (
        await tx.event.findMany({
          where: { workflowId: id },
          select: { id: true },
        })
      ).map((e) => e.id);

      if (eventIds.length > 0) {
        await tx.comment.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.snooze.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.eventHistory.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.event.deleteMany({ where: { workflowId: id } });
      }

      return tx.workflow.delete({ where: { id } });
    });
  }

  async simulate(
    id: string,
    metricValue: number,
    userId: string,
    dryRun: boolean,
  ): Promise<SimulateWorkflowResult> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Workflow ${id} not found`,
      });
    }

    if (!workflow.triggerConfig) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workflow has no trigger configuration',
      });
    }

    // Parse triggerConfig with Zod for runtime safety
    const config = triggerConfigSchema.parse(workflow.triggerConfig);

    // Evaluate the trigger condition
    const { triggered, details } = this.triggerEvaluation.evaluate(config, metricValue);

    // Render output message
    const metricName = config.type === 'THRESHOLD' ? config.metric : 'metric';
    const message = workflow.outputMessage
      ? this.triggerEvaluation.renderMessage(workflow.outputMessage, metricName, metricValue)
      : `Trigger evaluation: ${details}`;

    // If triggered and not a dry run, create the event
    if (triggered && !dryRun) {
      try {
        await this.eventsService.trigger(
          {
            workflowId: id,
            title: message,
            payload: { metricValue, details, simulatedBy: userId },
          },
          userId,
        );
      } catch (error) {
        // Handle CONFLICT (duplicate open event) gracefully
        if (error instanceof TRPCError && error.code === 'CONFLICT') {
          return { triggered, message, details, dryRun, alreadyOpen: true };
        }
        throw error;
      }
    }

    return { triggered, message, details, dryRun };
  }

  private filterSelfRecipients(
    recipients: unknown,
    currentUser: { id: string; email: string },
  ): Recipient[] {
    return parseRecipients(recipients).filter(
      (r) =>
        !(r.channel === 'IN_APP' && r.destination === currentUser.id) &&
        !(r.channel === 'EMAIL' && r.destination === currentUser.email),
    );
  }

  private async ensureExists(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Workflow ${id} not found`,
      });
    }

    return workflow;
  }
}
