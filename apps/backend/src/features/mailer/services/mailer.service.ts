import { Inject, Injectable, Logger } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import type { Transporter } from 'nodemailer';

import { MAILER_TRANSPORT, MAILER_MODULE_OPTIONS } from '../constants/mailer.constants';
import { MailerModuleOptions, SendEmailOptions, SendEmailResponse } from '../interfaces';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @Inject(MAILER_TRANSPORT)
    private readonly transporter: Transporter | null,
    @Inject(MAILER_MODULE_OPTIONS)
    private readonly options: MailerModuleOptions,
  ) {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — email sending is disabled. Set SMTP_HOST to enable.');
    }
  }

  async send(emailOptions: SendEmailOptions): Promise<SendEmailResponse> {
    if (!this.transporter) {
      this.logger.warn(
        `Email skipped (SMTP not configured): "${emailOptions.subject}" to ${emailOptions.to}`,
      );
      return { id: 'skipped-no-smtp' };
    }

    const from = emailOptions.from || this.options.defaultFrom;

    if (!from) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'No "from" address provided. Either pass it in emailOptions or set defaultFrom in module options.',
      });
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        replyTo: Array.isArray(emailOptions.replyTo)
          ? emailOptions.replyTo.join(', ')
          : emailOptions.replyTo,
        cc: Array.isArray(emailOptions.cc) ? emailOptions.cc.join(', ') : emailOptions.cc,
        bcc: Array.isArray(emailOptions.bcc) ? emailOptions.bcc.join(', ') : emailOptions.bcc,
      });

      const emailId = info.messageId ?? 'unknown';
      this.logger.log(`Email sent successfully: ${emailId}`);
      return { id: emailId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email: ${message}`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to send email: ${message}`,
      });
    }
  }

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
