import { Router, Query, Ctx, UseMiddlewares } from 'nestjs-trpc';
import { userListOutputSchema } from '@workflow-manager/shared';
import { PrismaService } from '../../database/prisma.service';
import { AuthMiddleware } from '../../trpc/auth.middleware';
import type { AppContextType } from '../../trpc/context';

@Router({ alias: 'users' })
@UseMiddlewares(AuthMiddleware)
export class UsersRouter {
  constructor(private readonly prisma: PrismaService) {}

  @Query({ output: userListOutputSchema })
  async list(@Ctx() ctx: AppContextType) {
    return this.prisma.user.findMany({
      where: {
        id: {
          notIn: [ctx.user!.id, 'system'],
        },
      },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
