import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  PaginationInput,
} from '@workflow-manager/shared';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findOne(id: string) {
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

    return workflow;
  }

  async create(input: CreateWorkflowInput, userId: string) {
    return this.prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        userId,
      },
    });
  }

  async update(id: string, input: UpdateWorkflowInput) {
    await this.ensureExists(id);

    return this.prisma.workflow.update({
      where: { id },
      data: input,
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

    return this.prisma.workflow.delete({
      where: { id },
    });
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
