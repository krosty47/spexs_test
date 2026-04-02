import { Router, Query, Mutation, Input, Ctx, UseMiddlewares } from 'nestjs-trpc';
import { notificationListSchema, markNotificationReadSchema } from '@workflow-manager/shared';
import type { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'notifications' })
@UseMiddlewares(AuthMiddleware)
export class NotificationsRouter {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query({ input: notificationListSchema })
  async list(@Input() input: z.infer<typeof notificationListSchema>, @Ctx() ctx: AppContextType) {
    return this.notificationsService.findAllForUser(
      ctx.user!.id,
      { page: input.page, limit: input.limit },
      input.unreadOnly,
    );
  }

  @Query()
  async unreadCount(@Ctx() ctx: AppContextType) {
    return this.notificationsService.getUnreadCount(ctx.user!.id);
  }

  @Mutation({ input: markNotificationReadSchema })
  async markAsRead(
    @Input() input: z.infer<typeof markNotificationReadSchema>,
    @Ctx() ctx: AppContextType,
  ) {
    return this.notificationsService.markAsRead(input.id, ctx.user!.id);
  }

  @Mutation()
  async markAllAsRead(@Ctx() ctx: AppContextType) {
    return this.notificationsService.markAllAsRead(ctx.user!.id);
  }
}
