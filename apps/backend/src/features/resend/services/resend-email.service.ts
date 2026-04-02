import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import {
  RESEND_CLIENT,
  RESEND_MODULE_OPTIONS,
} from '../constants/resend.constants';
import {
  ResendModuleOptions,
  SendEmailOptions,
  SendEmailResponse,
} from '../interfaces';

/**
 * Service for sending emails via Resend
 */
@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);

  constructor(
    @Inject(RESEND_CLIENT)
    private readonly resend: Resend | null,
    @Inject(RESEND_MODULE_OPTIONS)
    private readonly options: ResendModuleOptions,
  ) {
    if (!this.resend) {
      this.logger.warn(
        'Resend API key not configured — email sending is disabled. Set RESEND_API_KEY to enable.',
      );
    }
  }

  /**
   * Send an email using Resend
   *
   * @param emailOptions - Email configuration
   * @returns The sent email ID
   * @throws Error if sending fails
   *
   * @example
   * ```typescript
   * await resendEmailService.send({
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   html: '<h1>Hello World</h1>',
   * });
   * ```
   */
  async send(emailOptions: SendEmailOptions): Promise<SendEmailResponse> {
    if (!this.resend) {
      this.logger.warn(`Email skipped (no API key): "${emailOptions.subject}" to ${emailOptions.to}`);
      return { id: 'skipped-no-api-key' };
    }

    const from = emailOptions.from || this.options.defaultFrom;

    if (!from) {
      throw new Error(
        'No "from" address provided. Either pass it in emailOptions or set defaultFrom in module options.',
      );
    }

    const payload: Record<string, unknown> = {
      from,
      to: emailOptions.to,
      subject: emailOptions.subject,
    };

    if (emailOptions.html) payload.html = emailOptions.html;
    if (emailOptions.text) payload.text = emailOptions.text;
    if (emailOptions.replyTo) payload.replyTo = emailOptions.replyTo;
    if (emailOptions.cc) payload.cc = emailOptions.cc;
    if (emailOptions.bcc) payload.bcc = emailOptions.bcc;
    if (emailOptions.headers) payload.headers = emailOptions.headers;
    if (emailOptions.tags) payload.tags = emailOptions.tags;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.resend.emails.send(payload as any);

    if (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    const emailId = data?.id ?? 'unknown';
    this.logger.log(`Email sent successfully: ${emailId}`);
    return { id: emailId };
  }

  /**
   * Send a batch of emails
   *
   * @param emails - Array of email options
   * @returns Array of sent email IDs
   */
  async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResponse[]> {
    const settled = await Promise.allSettled(emails.map((email) => this.send(email)));
    const results: SendEmailResponse[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        this.logger.error(`Batch email failed: ${result.reason}`);
        results.push({ id: 'failed' });
      }
    }
    return results;
  }
}
