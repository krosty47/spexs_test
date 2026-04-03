import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all users except the current user and the system user. */
  async findAll(excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: {
          notIn: [excludeUserId, 'system'],
        },
      },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
