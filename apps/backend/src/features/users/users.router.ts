import { Router, Query, Ctx, UseMiddlewares } from 'nestjs-trpc';
import { userListOutputSchema } from '@workflow-manager/shared';
import { UsersService } from './users.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'users' })
@UseMiddlewares(AuthMiddleware)
export class UsersRouter {
  constructor(private readonly usersService: UsersService) {}

  @Query({ output: userListOutputSchema })
  async list(@Ctx() ctx: AppContextType) {
    return this.usersService.findAll(ctx.user!.id);
  }
}
