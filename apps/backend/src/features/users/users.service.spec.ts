import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockDeep<PrismaClient>() }],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return users excluding current user and system user', async () => {
      const mockUsers = [
        { id: 'user-2', email: 'user2@test.com', name: 'User Two' },
        { id: 'user-3', email: 'user3@test.com', name: 'User Three' },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers as never);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            notIn: ['user-1', 'system'],
          },
        },
        select: { id: true, email: true, name: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no other users exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });
});
