import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { CronJob } from 'cron';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from './events.service';
import { eventReopenedTemplate } from '../mailer/templates';

@Injectable()
export class SnoozeExpirationService implements OnModuleInit {
  private readonly logger = new Logger(SnoozeExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Safety-net cron: catches anything missed during a restart
    const cron = this.configService.get<string>('SNOOZE_CRON', '*/15 * * * *');
    this.logger.log(`Scheduling safety-net snooze cron: ${cron}`);

    const job = new CronJob(cron, () => {
      this.handleExpiredSnoozes().catch((err) => {
        this.logger.error('Unhandled error in handleExpiredSnoozes', err);
      });
    });

    this.schedulerRegistry.addCronJob('snooze-expiration', job);
    job.start();

    // Re-schedule precise timeouts for all existing unexpired snoozes from DB
    await this.rehydrateSnoozeTimeouts();
  }

  @OnEvent('snooze.scheduled')
  handleSnoozeScheduled(payload: { eventId: string; until: Date }): void {
    this.scheduleSnoozeTimeout(payload.eventId, payload.until);
  }

  @OnEvent('snooze.cleared')
  handleSnoozeCancelled(payload: { eventId: string }): void {
    this.clearSnoozeTimeout(payload.eventId);
  }

  /**
   * Schedule a precise timeout that fires when a snooze expires.
   */
  scheduleSnoozeTimeout(eventId: string, until: Date): void {
    const delayMs = until.getTime() - Date.now();

    // If already expired, process immediately
    if (delayMs <= 0) {
      this.processExpiredSnooze(eventId).catch((err) => {
        this.logger.error(`Failed to process already-expired snooze for event ${eventId}`, err);
      });
      return;
    }

    const timeoutName = `snooze-${eventId}`;

    // Clear any existing timeout for this event (e.g. re-snooze)
    this.clearSnoozeTimeout(eventId);

    const timeout = setTimeout(() => {
      try {
        this.schedulerRegistry.deleteTimeout(timeoutName);
      } catch {
        // Already removed — no-op
      }
      this.processExpiredSnooze(eventId).catch((err) => {
        this.logger.error(`Failed to process expired snooze for event ${eventId}`, err);
      });
    }, delayMs);

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
    this.logger.log(
      `Scheduled snooze timeout for event ${eventId} in ${Math.round(delayMs / 1000)}s`,
    );
  }

  /**
   * Cancel a scheduled snooze timeout (e.g. when the event is resolved before expiry).
   */
  clearSnoozeTimeout(eventId: string): void {
    const timeoutName = `snooze-${eventId}`;
    try {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    } catch {
      // Timeout doesn't exist — nothing to clear
    }
  }

  /**
   * On server boot, query all active snoozes from DB and schedule their timeouts.
   */
  private async rehydrateSnoozeTimeouts(): Promise<void> {
    const activeSnoozes = await this.prisma.snooze.findMany({
      where: {
        event: { status: 'SNOOZED' },
      },
      select: { eventId: true, until: true },
    });

    if (activeSnoozes.length === 0) return;

    if (activeSnoozes.length > 1000) {
      this.logger.warn(
        `Rehydrating ${activeSnoozes.length} snooze timeouts — consider scaling strategy`,
      );
    }
    this.logger.log(`Rehydrating ${activeSnoozes.length} snooze timeout(s)`);

    for (const snooze of activeSnoozes) {
      this.scheduleSnoozeTimeout(snooze.eventId, snooze.until);
    }
  }

  /**
   * Process a single expired snooze: reopen event, delete snooze, send notifications.
   */
  private async processExpiredSnooze(eventId: string): Promise<void> {
    // Fetch event + workflow in one query to confirm it's still snoozed
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        workflowId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            userId: true,
            recipients: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!event || event.status !== 'SNOOZED') {
      return; // Already resolved or no longer snoozed
    }

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

    this.logger.log(`Reopened event ${event.id} (snooze expired)`);

    this.eventsService.sendStatusNotifications({
      event: { id: event.id, title: event.title, workflowId: event.workflowId },
      workflow: event.workflow,
      userId: EventsService.SYSTEM_USER_ID,
      type: 'EVENT_REOPENED',
      sseEvent: 'event.reopened',
      title: `Event reopened: ${event.title}`,
      body: `Snooze expired — event from workflow "${event.workflow.name}" is open again and needs attention.`,
      emailSubject: `Reopened: ${event.title}`,
      emailHtml: eventReopenedTemplate({
        eventTitle: event.title,
        workflowName: event.workflow.name,
      }),
    });
  }

  /**
   * Safety-net cron: catches expired snoozes missed during restarts or scheduling gaps.
   */
  async handleExpiredSnoozes(): Promise<void> {
    const now = new Date();

    const expiredEvents = await this.prisma.event.findMany({
      where: {
        status: 'SNOOZED',
        snooze: { until: { lte: now } },
      },
      select: { id: true },
    });

    if (expiredEvents.length === 0) return;

    this.logger.log(`Safety-net cron found ${expiredEvents.length} expired snooze(s)`);

    for (const event of expiredEvents) {
      await this.processExpiredSnooze(event.id).catch((err) => {
        this.logger.error(`Failed to process expired snooze for event ${event.id}`, err);
      });
    }
  }
}
