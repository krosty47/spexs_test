import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import {
  triggerEventSchema,
  resolveEventSchema,
  snoozeEventSchema,
  addCommentSchema,
  eventIdSchema,
  eventFilterSchema,
  paginationSchema,
  eventListOutputSchema,
  eventDetailOutputSchema,
  eventOutputSchema,
  addCommentOutputSchema,
} from '@workflow-manager/shared';
import { z } from 'zod';
import { EventsService } from './events.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'events' })
@UseMiddlewares(AuthMiddleware)
export class EventsRouter {
  constructor(private readonly eventsService: EventsService) {}

  @Query({
    input: z.object({
      pagination: paginationSchema,
      filters: eventFilterSchema.optional(),
    }),
    output: eventListOutputSchema,
  })
  async findAll(
    @Input()
    input: {
      pagination: z.infer<typeof paginationSchema>;
      filters?: z.infer<typeof eventFilterSchema>;
    },
  ) {
    return this.eventsService.findAll(input.pagination, input.filters);
  }

  @Query({ input: eventIdSchema, output: eventDetailOutputSchema })
  async findOne(@Input() input: z.infer<typeof eventIdSchema>) {
    return this.eventsService.findOne(input.id);
  }

  @Mutation({ input: triggerEventSchema, output: eventOutputSchema })
  async trigger(@Input() input: z.infer<typeof triggerEventSchema>, @Ctx() ctx: AppContextType) {
    return this.eventsService.trigger(input, ctx.user?.id);
  }

  @Mutation({ input: resolveEventSchema, output: eventOutputSchema })
  async resolve(@Input() input: z.infer<typeof resolveEventSchema>, @Ctx() ctx: AppContextType) {
    return this.eventsService.resolve(input.id, ctx.user!.id);
  }

  @Mutation({ input: snoozeEventSchema, output: eventOutputSchema })
  async snooze(@Input() input: z.infer<typeof snoozeEventSchema>, @Ctx() ctx: AppContextType) {
    return this.eventsService.snooze(input.id, input, ctx.user!.id);
  }

  @Mutation({ input: addCommentSchema, output: addCommentOutputSchema })
  async addComment(@Input() input: z.infer<typeof addCommentSchema>, @Ctx() ctx: AppContextType) {
    return this.eventsService.addComment(input.eventId, input.content, ctx.user!.id);
  }
}
