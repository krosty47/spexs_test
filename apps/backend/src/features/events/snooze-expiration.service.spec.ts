import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { SnoozeExpirationService } from './snooze-expiration.service';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from './events.service';

const mockWorkflow = {
  id: 'wf-1',
  name: 'Test Workflow',
  userId: 'user-owner',
  recipients: [{ channel: 'IN_APP', destination: 'user-2' }],
};

const mockSnoozedEventDetail = {
  id: 'evt-1',
  title: 'Snoozed Event',
  status: 'SNOOZED' as const,
  workflowId: 'wf-1',
  workflow: mockWorkflow,
};

const mockSnoozedEventDetail2 = {
  id: 'evt-2',
  title: 'Snoozed Event 2',
  status: 'SNOOZED' as const,
  workflowId: 'wf-2',
  workflow: mockWorkflow,
};

function createTxMock() {
  return mockDeep<PrismaClient>();
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

function setupTxMockDefaults(txMock: DeepMockProxy<PrismaClient>) {
  txMock.event.update.mockResolvedValue({ status: 'OPEN' } as never);
  txMock.eventHistory.create.mockResolvedValue({
    id: 'hist-1',
    action: 'REOPENED',
    createdAt: new Date(),
    eventId: 'evt-1',
    userId: 'system',
  });
  txMock.snooze.delete.mockResolvedValue({} as never);
}

describe('SnoozeExpirationService', () => {
  let service: SnoozeExpirationService;
  let prisma: DeepMockProxy<PrismaClient>;
  let eventsService: { sendStatusNotifications: jest.Mock };

  beforeEach(async () => {
    eventsService = {
      sendStatusNotifications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnoozeExpirationService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: EventsService, useValue: eventsService },
        { provide: ConfigService, useValue: { get: () => '*/15 * * * *' } },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
            addTimeout: jest.fn(),
            deleteTimeout: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SnoozeExpirationService>(SnoozeExpirationService);
    prisma = module.get(PrismaService);
  });

  describe('handleExpiredSnoozes', () => {
    it('should reopen events with expired snoozes', async () => {
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }] as never);
      prisma.event.findUnique.mockResolvedValue(mockSnoozedEventDetail as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(txMock.event.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { status: 'OPEN' },
      });
    });

    it('should create REOPENED history entry', async () => {
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }] as never);
      prisma.event.findUnique.mockResolvedValue(mockSnoozedEventDetail as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(txMock.eventHistory.create).toHaveBeenCalledWith({
        data: {
          action: 'REOPENED',
          eventId: 'evt-1',
          userId: 'system',
        },
      });
    });

    it('should delete the Snooze record', async () => {
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }] as never);
      prisma.event.findUnique.mockResolvedValue(mockSnoozedEventDetail as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(txMock.snooze.delete).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
      });
    });

    it('should call sendStatusNotifications for each reopened event', async () => {
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }, { id: 'evt-2' }] as never);
      prisma.event.findUnique
        .mockResolvedValueOnce(mockSnoozedEventDetail as never)
        .mockResolvedValueOnce(mockSnoozedEventDetail2 as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(eventsService.sendStatusNotifications).toHaveBeenCalledTimes(2);
      expect(eventsService.sendStatusNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ id: 'evt-1' }),
          type: 'EVENT_REOPENED',
          sseEvent: 'event.reopened',
        }),
      );
      expect(eventsService.sendStatusNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ id: 'evt-2' }),
          type: 'EVENT_REOPENED',
          sseEvent: 'event.reopened',
        }),
      );
    });

    it('should skip events that are no longer snoozed', async () => {
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }] as never);
      prisma.event.findUnique.mockResolvedValue({
        ...mockSnoozedEventDetail,
        status: 'RESOLVED',
      } as never);

      await service.handleExpiredSnoozes();

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventsService.sendStatusNotifications).not.toHaveBeenCalled();
    });

    it('should handle empty result set gracefully', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.handleExpiredSnoozes();

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventsService.sendStatusNotifications).not.toHaveBeenCalled();
    });

    it('should query only snoozed events with expired until date', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.handleExpiredSnoozes();

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SNOOZED',
            snooze: expect.objectContaining({
              until: expect.objectContaining({ lte: expect.any(Date) }),
            }),
          }),
        }),
      );
    });
  });

  describe('scheduleSnoozeTimeout', () => {
    it('should process immediately when snooze is already expired', async () => {
      const pastDate = new Date(Date.now() - 1000);
      prisma.event.findUnique.mockResolvedValue(mockSnoozedEventDetail as never);
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      setupTransaction(prisma, txMock);

      service.scheduleSnoozeTimeout('evt-1', pastDate);

      // Give the async processExpiredSnooze time to run
      await new Promise((r) => setTimeout(r, 50));

      expect(eventsService.sendStatusNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ id: 'evt-1' }),
          type: 'EVENT_REOPENED',
        }),
      );
    });
  });
});
