import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowIdSchema,
  paginationSchema,
  simulateWorkflowSchema,
  workflowListOutputSchema,
  workflowDetailOutputSchema,
  workflowOutputSchema,
  simulateWorkflowOutputSchema,
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

  @Query({ input: paginationSchema, output: workflowListOutputSchema })
  async findAll(@Input() input: z.infer<typeof paginationSchema>) {
    return this.workflowsService.findAll(input);
  }

  @Query({ input: workflowIdSchema, output: workflowDetailOutputSchema })
  async findOne(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.findOne(input.id);
  }

  @Mutation({ input: createWorkflowSchema, output: workflowOutputSchema })
  async create(@Input() input: z.infer<typeof createWorkflowSchema>, @Ctx() ctx: AppContextType) {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return this.workflowsService.create(input, ctx.user.id);
  }

  @Mutation({
    input: z.object({
      id: z.string().cuid(),
      data: updateWorkflowSchema,
    }),
    output: workflowOutputSchema,
  })
  async update(@Input() input: { id: string; data: z.infer<typeof updateWorkflowSchema> }) {
    return this.workflowsService.update(input.id, input.data);
  }

  @Mutation({ input: workflowIdSchema, output: workflowOutputSchema })
  async toggleActive(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.toggleActive(input.id);
  }

  @Mutation({ input: workflowIdSchema, output: workflowOutputSchema })
  async delete(@Input() input: z.infer<typeof workflowIdSchema>) {
    return this.workflowsService.delete(input.id);
  }

  @Mutation({ input: simulateWorkflowSchema, output: simulateWorkflowOutputSchema })
  async simulate(
    @Input() input: z.infer<typeof simulateWorkflowSchema>,
    @Ctx() ctx: AppContextType,
  ) {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return this.workflowsService.simulate(input.id, input.metricValue, ctx.user.id, input.dryRun);
  }
}
