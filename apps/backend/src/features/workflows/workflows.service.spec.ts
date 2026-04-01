import { Test, type TestingModule } from '@nestjs/testing';
import { TRPCError } from '@trpc/server';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../../database/prisma.service';

const mockWorkflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

const _mockWorkflowWithCount = {
  ...mockWorkflow,
  _count: { events: 3 },
};

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowsService, { provide: PrismaService, useValue: mockDeep<PrismaClient>() }],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated workflows', async () => {
      prisma.workflow.findMany.mockResolvedValue([mockWorkflow]);
      prisma.workflow.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should respect pagination params', async () => {
      prisma.workflow.findMany.mockResolvedValue([]);
      prisma.workflow.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return workflow by ID', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.findOne('wf-1');

      expect(result.id).toBe('wf-1');
      expect(result.name).toBe('Test Workflow');
    });

    it('should throw NOT_FOUND for missing workflow', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(TRPCError);
      await expect(service.findOne('nonexistent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('create', () => {
    it('should create workflow associated with user', async () => {
      prisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.create(
        { name: 'Test Workflow', description: 'A test workflow' },
        'user-1',
      );

      expect(result.name).toBe('Test Workflow');
      expect(prisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Workflow',
          userId: 'user-1',
        }),
      });
    });
  });

  describe('update', () => {
    it('should update workflow fields', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        name: 'Updated Name',
      });

      const result = await service.update('wf-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NOT_FOUND for missing workflow', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('toggleActive', () => {
    it('should toggle isActive boolean', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        isActive: true,
      });

      const result = await service.toggleActive('wf-1');

      expect(result.isActive).toBe(true);
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
        data: { isActive: true },
      });
    });
  });

  describe('delete', () => {
    it('should delete workflow', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.workflow.delete.mockResolvedValue(mockWorkflow);

      const result = await service.delete('wf-1');

      expect(result.id).toBe('wf-1');
      expect(prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
      });
    });

    it('should throw NOT_FOUND for missing workflow', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
