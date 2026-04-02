import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from '../mailer/services/mailer.service';
import { dailySummaryTemplate, type WorkflowSummaryRow } from '../mailer/templates';

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Daily cron job at 8 AM -- aggregates events from the last 24 hours
   * and sends a summary email via SMTP (if configured).
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateSummary(): Promise<void> {
    // Check if SMTP is configured before querying the DB
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.warn('SMTP_HOST not configured -- skipping daily summary email');
      return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Aggregate events by workflow and status
    const groups = await this.prisma.event.groupBy({
      by: ['workflowId', 'status'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    if (groups.length === 0) {
      this.logger.log('No events in the last 24 hours -- skipping daily summary email');
      return;
    }

    // Fetch workflow names
    const workflowIds = [...new Set(groups.map((g) => g.workflowId))];
    const workflows = await this.prisma.workflow.findMany({
      where: { id: { in: workflowIds } },
      select: { id: true, name: true },
    });
    const workflowMap = new Map(workflows.map((w) => [w.id, w.name]));

    // Build summary rows
    const rowMap = new Map<string, WorkflowSummaryRow>();
    for (const group of groups) {
      const name = workflowMap.get(group.workflowId) ?? group.workflowId;
      if (!rowMap.has(group.workflowId)) {
        rowMap.set(group.workflowId, { workflowName: name, open: 0, resolved: 0, snoozed: 0 });
      }
      const row = rowMap.get(group.workflowId)!;
      const status = group.status.toLowerCase() as 'open' | 'resolved' | 'snoozed';
      if (status in row) {
        row[status] = group._count.id;
      }
    }

    const rows = [...rowMap.values()];
    const html = dailySummaryTemplate({ rows, since });

    const recipient = this.configService.get<string>('DAILY_SUMMARY_TO');
    if (!recipient) {
      this.logger.warn('DAILY_SUMMARY_TO not configured -- skipping daily summary email');
      return;
    }

    try {
      await this.mailerService.send({
        to: recipient,
        subject: `Daily Event Summary - ${new Date().toLocaleDateString()}`,
        html,
      });
      this.logger.log('Daily summary email sent successfully');
    } catch (error) {
      this.logger.error('Failed to send daily summary email', error);
    }
  }
}
