import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { SnoozeExpirationService } from './snooze-expiration.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

const mockSnoozedEvent = {
  id: 'evt-1',
  title: 'Snoozed Event',
  payload: { key: 'value' },
  status: 'SNOOZED' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  workflowId: 'wf-1',
  resolvedAt: null,
  resolvedById: null,
  snooze: {
    id: 'snooze-1',
    until: pastDate,
    reason: 'Maintenance',
    createdAt: new Date(),
    eventId: 'evt-1',
    userId: 'user-1',
  },
};

const mockSnoozedEvent2 = {
  id: 'evt-2',
  title: 'Snoozed Event 2',
  payload: {},
  status: 'SNOOZED' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  workflowId: 'wf-2',
  resolvedAt: null,
  resolvedById: null,
  snooze: {
    id: 'snooze-2',
    until: pastDate,
    reason: null,
    createdAt: new Date(),
    eventId: 'evt-2',
    userId: 'user-2',
  },
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
  txMock.event.update.mockResolvedValue({
    ...mockSnoozedEvent,
    status: 'OPEN' as const,
  } as never);
  txMock.eventHistory.create.mockResolvedValue({
    id: 'hist-1',
    action: 'REOPENED',
    createdAt: new Date(),
    eventId: 'evt-1',
    userId: 'system',
  });
  txMock.snooze.delete.mockResolvedValue(mockSnoozedEvent.snooze as never);
}

describe('SnoozeExpirationService', () => {
  let service: SnoozeExpirationService;
  let prisma: DeepMockProxy<PrismaClient>;
  let notificationsService: { notify: jest.Mock };

  beforeEach(async () => {
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnoozeExpirationService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<SnoozeExpirationService>(SnoozeExpirationService);
    prisma = module.get(PrismaService);
  });

  describe('handleExpiredSnoozes', () => {
    it('should reopen events with expired snoozes', async () => {
      const txMock = createTxMock();
      setupTxMockDefaults(txMock);
      prisma.event.findMany.mockResolvedValue([mockSnoozedEvent] as never);
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
      prisma.event.findMany.mockResolvedValue([mockSnoozedEvent] as never);
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
      prisma.event.findMany.mockResolvedValue([mockSnoozedEvent] as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(txMock.snooze.delete).toHaveBeenCalledWith({
        where: { eventId: 'evt-1' },
      });
    });

    it('should call NotificationsService.notify for each reopened event', async () => {
      const txMock = createTxMock();
      txMock.event.update.mockResolvedValue({ status: 'OPEN' } as never);
      txMock.eventHistory.create.mockResolvedValue({
        id: 'hist-1',
        action: 'REOPENED',
        createdAt: new Date(),
        eventId: 'evt-1',
        userId: 'system',
      });
      txMock.snooze.delete.mockResolvedValue({} as never);
      prisma.event.findMany.mockResolvedValue([mockSnoozedEvent, mockSnoozedEvent2] as never);
      setupTransaction(prisma, txMock);

      await service.handleExpiredSnoozes();

      expect(notificationsService.notify).toHaveBeenCalledTimes(2);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'system',
        'event.reopened',
        expect.objectContaining({ eventId: 'evt-1' }),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'system',
        'event.reopened',
        expect.objectContaining({ eventId: 'evt-2' }),
      );
    });

    it('should handle empty result set gracefully', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.handleExpiredSnoozes();

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('should not touch snoozes with future until date', async () => {
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
});
