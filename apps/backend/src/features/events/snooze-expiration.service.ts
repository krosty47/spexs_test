import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from './events.service';

@Injectable()
export class SnoozeExpirationService implements OnModuleInit {
  private readonly logger = new Logger(SnoozeExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cron = this.configService.get<string>('SNOOZE_CRON', '*/5 * * * *');
    this.logger.log(`Scheduling snooze expiration cron: ${cron}`);

    const job = new CronJob(cron, () => {
      this.handleExpiredSnoozes().catch((err) => {
        this.logger.error('Unhandled error in handleExpiredSnoozes', err);
      });
    });

    this.schedulerRegistry.addCronJob('snooze-expiration', job);
    job.start();
  }

  async handleExpiredSnoozes(): Promise<void> {
    const now = new Date();

    // Batch query for all snoozed events with expired snooze, include workflow for notifications
    const expiredEvents = await this.prisma.event.findMany({
      where: {
        status: 'SNOOZED',
        snooze: {
          until: { lte: now },
        },
      },
      select: {
        id: true,
        title: true,
        workflowId: true,
        snooze: { select: { eventId: true } },
        workflow: {
          select: {
            id: true,
            name: true,
            userId: true,
            recipients: true,
          },
        },
      },
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

        this.eventsService.sendStatusNotifications({
          event: { id: event.id, title: event.title, workflowId: event.workflowId },
          workflow: event.workflow,
          userId: EventsService.SYSTEM_USER_ID,
          type: 'EVENT_REOPENED',
          sseEvent: 'event.reopened',
          title: `Event reopened: ${event.title}`,
          body: `Snooze expired — event from workflow "${event.workflow.name}" is open again and needs attention.`,
          emailSubject: `Reopened: ${event.title}`,
          emailHtml: `<p>Snooze expired — event <b>${event.title}</b> from workflow "${event.workflow.name}" is open again.</p>`,
        });
      } catch (error) {
        this.logger.error(`Failed to process expired snooze for event ${event.id}`, error);
      }
    }

    this.logger.log(`Processed ${expiredEvents.length} expired snooze(s)`);
  }
}
