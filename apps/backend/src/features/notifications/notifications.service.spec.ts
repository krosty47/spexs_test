import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';

const mockNotification = {
  id: 'notif-1',
  type: 'EVENT_TRIGGERED' as const,
  title: 'High CPU on server-01',
  body: 'CPU usage exceeded 90% on server-01',
  isRead: false,
  metadata: { eventId: 'evt-1', workflowId: 'wf-1' },
  createdAt: new Date('2026-04-01T10:00:00Z'),
  updatedAt: new Date('2026-04-01T10:00:00Z'),
  userId: 'user-1',
};

const mockReadNotification = {
  ...mockNotification,
  id: 'notif-2',
  isRead: true,
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  describe('subscribe', () => {
    it('should return an observable for a user', () => {
      const observable = service.subscribe('user-1');
      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();
    });

    it('should create user-specific subjects so events emit only to correct user', (done) => {
      const user1Events: unknown[] = [];
      const user2Events: unknown[] = [];

      const obs1 = service.subscribe('user-1');
      const obs2 = service.subscribe('user-2');

      obs1.subscribe((event) => user1Events.push(event));
      obs2.subscribe((event) => user2Events.push(event));

      service.notify('user-1', 'test.event', { data: 'for-user-1' });
      service.notify('user-2', 'test.event', { data: 'for-user-2' });

      // Give RxJS a tick to propagate
      setTimeout(() => {
        expect(user1Events).toHaveLength(1);
        expect(user2Events).toHaveLength(1);
        expect((user1Events[0] as { data: unknown }).data).toEqual({ data: 'for-user-1' });
        expect((user2Events[0] as { data: unknown }).data).toEqual({ data: 'for-user-2' });
        done();
      }, 10);
    });

    it('should support multiple subscribers for the same user', (done) => {
      const sub1Events: unknown[] = [];
      const sub2Events: unknown[] = [];

      const obs1 = service.subscribe('user-1');
      const obs2 = service.subscribe('user-1');

      obs1.subscribe((event) => sub1Events.push(event));
      obs2.subscribe((event) => sub2Events.push(event));

      service.notify('user-1', 'test.event', { data: 'shared' });

      setTimeout(() => {
        expect(sub1Events).toHaveLength(1);
        expect(sub2Events).toHaveLength(1);
        done();
      }, 10);
    });

    it('should remove subject on unsubscribe', (done) => {
      const events: unknown[] = [];

      const obs = service.subscribe('user-1');
      const sub = obs.subscribe((event) => events.push(event));

      sub.unsubscribe();

      service.notify('user-1', 'test.event', { data: 'after-unsub' });

      setTimeout(() => {
        expect(events).toHaveLength(0);
        done();
      }, 10);
    });
  });

  describe('notify', () => {
    it('should emit to the correct user subjects', (done) => {
      const events: unknown[] = [];
      const obs = service.subscribe('user-1');
      obs.subscribe((event) => events.push(event));

      service.notify('user-1', 'event.triggered', { eventId: 'evt-1' });

      setTimeout(() => {
        expect(events).toHaveLength(1);
        done();
      }, 10);
    });

    it('should not error when user has no subscribers', () => {
      // Should not throw when no one is listening
      expect(() => {
        service.notify('user-no-sub', 'event.triggered', { eventId: 'evt-1' });
      }).not.toThrow();
    });

    it('should not emit to other users', (done) => {
      const user2Events: unknown[] = [];
      const obs = service.subscribe('user-2');
      obs.subscribe((event) => user2Events.push(event));

      service.notify('user-1', 'event.triggered', { eventId: 'evt-1' });

      setTimeout(() => {
        expect(user2Events).toHaveLength(0);
        done();
      }, 10);
    });
  });

  describe('send', () => {
    it('should persist notification to DB and push SSE event', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      const events: unknown[] = [];
      const obs = service.subscribe('user-1');
      obs.subscribe((event) => events.push(event));

      await service.send({
        userId: 'user-1',
        type: 'EVENT_TRIGGERED',
        title: 'High CPU on server-01',
        body: 'CPU usage exceeded 90% on server-01',
        metadata: { eventId: 'evt-1', workflowId: 'wf-1' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'EVENT_TRIGGERED',
          title: 'High CPU on server-01',
          body: 'CPU usage exceeded 90% on server-01',
          metadata: { eventId: 'evt-1', workflowId: 'wf-1' },
        },
      });

      // Wait for SSE propagation
      await new Promise((r) => setTimeout(r, 10));
      expect(events).toHaveLength(1);
    });

    it('should still persist even when no SSE subscribers exist', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      await service.send({
        userId: 'user-offline',
        type: 'EVENT_TRIGGERED',
        title: 'Offline notification',
        body: 'User is not connected',
        metadata: { eventId: 'evt-1', workflowId: 'wf-1' },
      });

      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated results for user', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAllForUser('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by unreadOnly when true', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);
      prisma.notification.count.mockResolvedValue(1);

      await service.findAllForUser('user-1', { page: 1, limit: 20 }, true);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });

    it('should only return notifications for the specified user', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAllForUser('user-2', { page: 1, limit: 20 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-2' },
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 5 });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should return 0 when all notifications are read', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should set isRead to true for a valid notification', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.findUnique.mockResolvedValue({ ...mockNotification, isRead: true });

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result!.isRead).toBe(true);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('should throw NOT_FOUND for invalid notification ID', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw FORBIDDEN if notification belongs to another user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      prisma.notification.findUnique.mockResolvedValue(mockNotification);

      await expect(service.markAsRead('notif-1', 'user-other')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should be idempotent for already-read notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.findUnique.mockResolvedValue(mockReadNotification);

      const result = await service.markAsRead('notif-2', 'user-1');

      expect(result!.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should batch update all unread notifications for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 3 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });

    it('should return count 0 when no unread notifications exist', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });
});
