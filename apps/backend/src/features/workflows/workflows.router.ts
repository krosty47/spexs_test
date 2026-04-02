import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowIdSchema,
  paginationSchema,
  simulateWorkflowSchema,
} from '@workflow-manager/shared';
import { z } from 'zod';
import { WorkflowsService } from './workflows.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import { TRPCError } from '@trpc/server';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'workflows' })
@UseMiddlewares(AuthMiddleware)
export class WorkflowsRouter {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Query({ input: paginationSchema })
  async findAll(@Input() input: z.infer<typeof paginationSchema>) {
    return this.workflowsService.findAll(input);
  }

  @Query({ input: workflowIdSchema })
  async findOne(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.findOne(input.id);
  }

  @Mutation({ input: createWorkflowSchema })
  async create(@Input() input: z.infer<typeof createWorkflowSchema>, @Ctx() ctx: AppContextType) {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return this.workflowsService.create(input, ctx.user.id);
  }

  @Mutation({
    input: z.object({
      id: z.string().cuid(),
      data: updateWorkflowSchema,
    }),
  })
  async update(@Input() input: { id: string; data: z.infer<typeof updateWorkflowSchema> }) {
    return this.workflowsService.update(input.id, input.data);
  }

  @Mutation({ input: workflowIdSchema })
  async toggleActive(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.toggleActive(input.id);
  }

  @Mutation({ input: workflowIdSchema })
  async delete(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.delete(input.id);
  }

  @Mutation({ input: simulateWorkflowSchema })
  async simulate(
    @Input() input: z.infer<typeof simulateWorkflowSchema>,
    @Ctx() ctx: AppContextType,
  ) {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return this.workflowsService.simulate(input.id, input.metricValue, ctx.user.id, input.dryRun);
  }
}
