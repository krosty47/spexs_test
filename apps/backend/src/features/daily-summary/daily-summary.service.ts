import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ResendEmailService } from '../resend';

interface WorkflowSummaryRow {
  workflowName: string;
  open: number;
  resolved: number;
  snoozed: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resendEmailService: ResendEmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Daily cron job at 8 AM -- aggregates events from the last 24 hours
   * and sends a summary email via Resend (if configured).
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateSummary(): Promise<void> {
    // Check if Resend is configured before querying the DB
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured -- skipping daily summary email');
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
    const html = this.buildHtml(rows, since);

    const recipient = this.configService.get<string>('DAILY_SUMMARY_TO');
    if (!recipient) {
      this.logger.warn('DAILY_SUMMARY_TO not configured -- skipping daily summary email');
      return;
    }

    try {
      await this.resendEmailService.send({
        to: recipient,
        subject: `Daily Event Summary - ${new Date().toLocaleDateString()}`,
        html,
      });
      this.logger.log('Daily summary email sent successfully');
    } catch (error) {
      this.logger.error('Failed to send daily summary email', error);
    }
  }

  private buildHtml(rows: WorkflowSummaryRow[], since: Date): string {
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.workflowName)}</td><td>${r.open}</td><td>${r.resolved}</td><td>${r.snoozed}</td></tr>`,
      )
      .join('');

    return `
      <h2>Daily Event Summary</h2>
      <p>Events since ${since.toISOString()}</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Workflow</th>
            <th>Open</th>
            <th>Resolved</th>
            <th>Snoozed</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `.trim();
  }
}
