import { Test, type TestingModule } from '@nestjs/testing';
import { TRPCError } from '@trpc/server';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { WorkflowsService } from './workflows.service';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../../database/prisma.service';

const mockWorkflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  isActive: false,
  triggerType: null,
  triggerConfig: null,
  outputMessage: null,
  recipients: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

const mockWorkflowWithTrigger = {
  ...mockWorkflow,
  isActive: true,
  triggerType: 'THRESHOLD' as const,
  triggerConfig: { type: 'THRESHOLD', metric: 'cpu_usage', operator: '>', value: 90 },
  outputMessage: 'Alert: {{metric}} reached {{value}}%',
  recipients: [{ channel: 'IN_APP', destination: 'admin@workflow.dev' }],
};

const _mockWorkflowWithCount = {
  ...mockWorkflow,
  _count: { events: 3 },
};

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let triggerEvalService: jest.Mocked<TriggerEvaluationService>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const mockTriggerEvalService = {
      evaluate: jest.fn(),
      renderMessage: jest.fn(),
    };

    const mockEventsService = {
      trigger: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: TriggerEvaluationService, useValue: mockTriggerEvalService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get(PrismaService);
    triggerEvalService = module.get(TriggerEvaluationService);
    eventsService = module.get(EventsService);
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

    it('should persist triggerConfig, outputMessage, and recipients', async () => {
      prisma.workflow.create.mockResolvedValue(mockWorkflowWithTrigger);

      await service.create(
        {
          name: 'Test Workflow',
          triggerType: 'THRESHOLD',
          triggerConfig: { type: 'THRESHOLD', metric: 'cpu_usage', operator: '>', value: 90 },
          outputMessage: 'Alert: {{metric}} reached {{value}}%',
          recipients: [{ channel: 'IN_APP', destination: 'admin@workflow.dev' }],
        },
        'user-1',
      );

      expect(prisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerType: 'THRESHOLD',
          triggerConfig: { type: 'THRESHOLD', metric: 'cpu_usage', operator: '>', value: 90 },
          outputMessage: 'Alert: {{metric}} reached {{value}}%',
          recipients: [{ channel: 'IN_APP', destination: 'admin@workflow.dev' }],
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
    it('should delete workflow and cascade related records', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }, { id: 'evt-2' }] as never);
      prisma.comment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.snooze.deleteMany.mockResolvedValue({ count: 0 });
      prisma.eventHistory.deleteMany.mockResolvedValue({ count: 0 });
      prisma.event.deleteMany.mockResolvedValue({ count: 2 });
      prisma.workflow.delete.mockResolvedValue(mockWorkflow);

      const result = await service.delete('wf-1');

      expect(result.id).toBe('wf-1');
      expect(prisma.event.deleteMany).toHaveBeenCalledWith({
        where: { workflowId: 'wf-1' },
      });
      expect(prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
      });
    });

    it('should delete workflow with no events', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
      prisma.event.findMany.mockResolvedValue([]);
      prisma.workflow.delete.mockResolvedValue(mockWorkflow);

      const result = await service.delete('wf-1');

      expect(result.id).toBe('wf-1');
      expect(prisma.event.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for missing workflow', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('simulate', () => {
    it('should return triggered=true when condition is met', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({
        triggered: true,
        details: 'THRESHOLD: cpu_usage 95 > 90 = true',
      });
      triggerEvalService.renderMessage.mockReturnValue('Alert: cpu_usage reached 95%');
      eventsService.trigger.mockResolvedValue({
        id: 'ev-1',
        title: 'Alert: cpu_usage reached 95%',
        payload: {},
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: 'wf-1',
        resolvedAt: null,
        resolvedById: null,
      });

      const result = await service.simulate('wf-1', 95, 'user-1', false);

      expect(result.triggered).toBe(true);
      expect(result.message).toBe('Alert: cpu_usage reached 95%');
      expect(result.dryRun).toBe(false);
    });

    it('should return triggered=false when condition is not met', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({
        triggered: false,
        details: 'THRESHOLD: cpu_usage 50 > 90 = false',
      });
      triggerEvalService.renderMessage.mockReturnValue('Alert: cpu_usage reached 50%');

      const result = await service.simulate('wf-1', 50, 'user-1', false);

      expect(result.triggered).toBe(false);
      expect(eventsService.trigger).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST when workflow has no triggerConfig', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      await expect(service.simulate('wf-1', 95, 'user-1', false)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should throw NOT_FOUND when workflow does not exist', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.simulate('nonexistent', 95, 'user-1', false)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should call EventsService.trigger when triggered and dryRun=false', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({ triggered: true, details: 'triggered' });
      triggerEvalService.renderMessage.mockReturnValue('Alert message');
      eventsService.trigger.mockResolvedValue({
        id: 'ev-1',
        title: 'Alert message',
        payload: {},
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: 'wf-1',
        resolvedAt: null,
        resolvedById: null,
      });

      await service.simulate('wf-1', 95, 'user-1', false);

      expect(eventsService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          title: 'Alert message',
        }),
        'user-1',
      );
    });

    it('should NOT call EventsService.trigger when dryRun=true', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({ triggered: true, details: 'triggered' });
      triggerEvalService.renderMessage.mockReturnValue('Alert message');

      const result = await service.simulate('wf-1', 95, 'user-1', true);

      expect(result.triggered).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(eventsService.trigger).not.toHaveBeenCalled();
    });

    it('should propagate CONFLICT when an unresolved event exists', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({ triggered: true, details: 'triggered' });
      triggerEvalService.renderMessage.mockReturnValue('Alert message');
      eventsService.trigger.mockRejectedValue(
        new TRPCError({
          code: 'CONFLICT',
          message: 'An unresolved event already exists for this workflow',
        }),
      );

      await expect(service.simulate('wf-1', 95, 'user-1', false)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should use custom eventTitle when provided', async () => {
      prisma.workflow.findUnique.mockResolvedValue(mockWorkflowWithTrigger);
      triggerEvalService.evaluate.mockReturnValue({ triggered: true, details: 'triggered' });
      triggerEvalService.renderMessage.mockReturnValue('Alert message');
      eventsService.trigger.mockResolvedValue({
        id: 'ev-1',
        title: 'My custom title',
        payload: {},
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: 'wf-1',
        resolvedAt: null,
        resolvedById: null,
      });

      await service.simulate('wf-1', 95, 'user-1', false, 'My custom title');

      expect(eventsService.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My custom title',
        }),
        'user-1',
      );
    });
  });
});
