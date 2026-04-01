import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from './events.service';

@Injectable()
export class SnoozeExpirationService {
  private readonly logger = new Logger(SnoozeExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/5 * * * *')
  async handleExpiredSnoozes(): Promise<void> {
    const now = new Date();

    // Batch query for all snoozed events with expired snooze
    const expiredEvents = await this.prisma.event.findMany({
      where: {
        status: 'SNOOZED',
        snooze: {
          until: { lte: now },
        },
      },
      select: { id: true, title: true, workflowId: true, snooze: { select: { eventId: true } } },
    });

    if (expiredEvents.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredEvents.length} expired snooze(s) to process`);

    for (const event of expiredEvents) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.event.update({
            where: { id: event.id },
            data: { status: 'OPEN' },
          });

          await tx.eventHistory.create({
            data: {
              action: 'REOPENED',
              eventId: event.id,
              userId: EventsService.SYSTEM_USER_ID,
            },
          });

          await tx.snooze.delete({
            where: { eventId: event.id },
          });
        });

        await this.notificationsService.notify(EventsService.SYSTEM_USER_ID, 'event.reopened', {
          eventId: event.id,
          title: event.title,
          workflowId: event.workflowId,
        });
      } catch (error) {
        this.logger.error(`Failed to process expired snooze for event ${event.id}`, error);
      }
    }

    this.logger.log(`Processed ${expiredEvents.length} expired snooze(s)`);
  }
}
