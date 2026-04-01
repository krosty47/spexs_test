import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockEvent = {
  id: 'evt-1',
  title: 'Test Event',
  payload: { key: 'value' },
  status: 'OPEN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  workflowId: 'wf-1',
  resolvedAt: null,
  resolvedById: null,
};

const mockResolvedEvent = {
  ...mockEvent,
  id: 'evt-2',
  status: 'RESOLVED' as const,
  resolvedAt: new Date(),
  resolvedById: 'user-1',
};

const mockWorkflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

function createTxMock() {
  const txMock = mockDeep<PrismaClient>();
  return txMock;
}

function setupTransaction(
  prisma: DeepMockProxy<PrismaClient>,
  txMock: DeepMockProxy<PrismaClient>,
) {
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (callback: (tx: PrismaClient) => Promise<unknown>) => {
      return callback(txMock);
    },
  );
}

describe('EventsService', () => {
  let service: EventsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let notificationsService: { notify: jest.Mock };

  beforeEach(async () => {
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated events', async () => {
      prisma.event.findMany.mockResolvedValue([mockEvent]);
      prisma.event.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, { status: 'OPEN' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });

    it('should filter by workflowId', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, { workflowId: 'wf-1' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workflowId: 'wf-1' }),
        }),
      );
    });
  });

  describe('trigger', () => {
    it('should create event with TRIGGERED history in a transaction', async () => {
      const txMock = createTxMock();
      txMock.event.findFirst.mockResolvedValue(null);
      txMock.event.create.mockResolvedValue(mockEvent);
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-1',
        action: 'TRIGGERED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'system',
      });

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      setupTransaction(prisma, txMock);

      const result = await service.trigger({
        title: 'Test Event',
        payload: { key: 'value' },
        workflowId: 'wf-1',
      });

      expect(result.title).toBe('Test Event');
      expect(txMock.eventHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TRIGGERED',
          eventId: 'evt-1',
        }),
      });
    });

    it('should throw NOT_FOUND when workflow does not exist', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);

      await expect(
        service.trigger({
          title: 'Test Event',
          payload: {},
          workflowId: 'wf-nonexistent',
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw BAD_REQUEST when workflow is inactive', async () => {
      prisma.workflow.findUnique.mockResolvedValue({ ...mockWorkflow, isActive: false });

      await expect(
        service.trigger({
          title: 'Test Event',
          payload: {},
          workflowId: 'wf-1',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should call NotificationsService.notify after creation', async () => {
      const txMock = createTxMock();
      txMock.event.findFirst.mockResolvedValue(null);
      txMock.event.create.mockResolvedValue(mockEvent);
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-1',
        action: 'TRIGGERED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'system',
      });

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      setupTransaction(prisma, txMock);

      await service.trigger({
        title: 'Test Event',
        payload: { key: 'value' },
        workflowId: 'wf-1',
      });

      expect(notificationsService.notify).toHaveBeenCalledWith(
        'system',
        'event.triggered',
        expect.objectContaining({ eventId: 'evt-1' }),
      );
    });

    it('should use triggeredBy userId when provided', async () => {
      const txMock = createTxMock();
      txMock.event.findFirst.mockResolvedValue(null);
      txMock.event.create.mockResolvedValue(mockEvent);
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-1',
        action: 'TRIGGERED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'user-1',
      });

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      setupTransaction(prisma, txMock);

      await service.trigger({ title: 'Test Event', payload: {}, workflowId: 'wf-1' }, 'user-1');

      expect(txMock.eventHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
        }),
      });
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'user-1',
        'event.triggered',
        expect.objectContaining({ eventId: 'evt-1' }),
      );
    });

    it('should reject duplicate open events for same workflow', async () => {
      const txMock = createTxMock();
      txMock.event.findFirst.mockResolvedValue(mockEvent);

      prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      setupTransaction(prisma, txMock);

      await expect(
        service.trigger({
          title: 'Duplicate Event',
          payload: {},
          workflowId: 'wf-1',
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('resolve', () => {
    it('should set status to RESOLVED and create history entry', async () => {
      const txMock = createTxMock();
      txMock.event.findUnique.mockResolvedValue(mockEvent);
      txMock.event.update.mockResolvedValue(mockResolvedEvent);
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-1',
        action: 'RESOLVED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'user-1',
      });

      setupTransaction(prisma, txMock);

      const result = await service.resolve('evt-1', 'user-1');

      expect(result.status).toBe('RESOLVED');
      expect(txMock.eventHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RESOLVED',
          eventId: 'evt-1',
          userId: 'user-1',
        }),
      });
    });

    it('should throw NOT_FOUND for missing event', async () => {
      const txMock = createTxMock();
      txMock.event.findUnique.mockResolvedValue(null);

      setupTransaction(prisma, txMock);

      await expect(service.resolve('nonexistent', 'user-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('snooze', () => {
    it('should create Snooze record and history entry', async () => {
      const snoozedEvent = { ...mockEvent, status: 'SNOOZED' as const };
      const txMock = createTxMock();
      txMock.event.findUnique.mockResolvedValue(mockEvent);
      txMock.event.update.mockResolvedValue(snoozedEvent);
      txMock.snooze.create.mockResolvedValue({
        id: 'snooze-1',
        until: new Date(),
        reason: 'Maintenance window',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'user-1',
      });
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-2',
        action: 'SNOOZED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'user-1',
      });

      setupTransaction(prisma, txMock);

      const snoozeUntil = new Date(Date.now() + 3600000);
      const result = await service.snooze(
        'evt-1',
        { id: 'evt-1', until: snoozeUntil, reason: 'Maintenance window' },
        'user-1',
      );

      expect(result.status).toBe('SNOOZED');
      expect(txMock.snooze.create).toHaveBeenCalled();
      expect(txMock.eventHistory.create).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should create comment on existing event', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        content: 'Test comment',
        createdAt: new Date(),
        updatedAt: new Date(),
        eventId: 'evt-1',
        userId: 'user-1',
      });

      const result = await service.addComment('evt-1', 'Test comment', 'user-1');

      expect(result.content).toBe('Test comment');
    });

    it('should throw NOT_FOUND for missing event', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment('nonexistent', 'Test comment', 'user-1'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
