import { Test, type TestingModule } from '@nestjs/testing';
import { TRPCError } from '@trpc/server';
import { MailerService } from './mailer.service';
import { MAILER_TRANSPORT, MAILER_MODULE_OPTIONS } from '../constants/mailer.constants';
import type { MailerModuleOptions } from '../interfaces';

describe('MailerService', () => {
  let service: MailerService;
  let mockTransporter: { sendMail: jest.Mock };

  const defaultOptions: MailerModuleOptions = {
    host: 'smtp.test.com',
    port: 587,
    defaultFrom: 'noreply@test.com',
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        { provide: MAILER_TRANSPORT, useValue: mockTransporter },
        { provide: MAILER_MODULE_OPTIONS, useValue: defaultOptions },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: '<email-123@test.com>',
      });

      const result = await service.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.id).toBe('<email-123@test.com>');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@test.com',
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      );
    });

    it('should throw TRPCError INTERNAL_SERVER_ERROR when no "from" address is provided', async () => {
      const moduleNoFrom: TestingModule = await Test.createTestingModule({
        providers: [
          MailerService,
          { provide: MAILER_TRANSPORT, useValue: mockTransporter },
          { provide: MAILER_MODULE_OPTIONS, useValue: { host: 'smtp.test.com' } },
        ],
      }).compile();

      const serviceNoFrom = moduleNoFrom.get<MailerService>(MailerService);

      await expect(
        serviceNoFrom.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        serviceNoFrom.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
    });

    it('should throw TRPCError INTERNAL_SERVER_ERROR when SMTP transport fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.send({
          to: 'user@test.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send email: Connection refused',
      });
    });

    it('should skip sending when SMTP is not configured', async () => {
      const moduleNoSmtp: TestingModule = await Test.createTestingModule({
        providers: [
          MailerService,
          { provide: MAILER_TRANSPORT, useValue: null },
          { provide: MAILER_MODULE_OPTIONS, useValue: { host: undefined } },
        ],
      }).compile();

      const serviceNoSmtp = moduleNoSmtp.get<MailerService>(MailerService);

      const result = await serviceNoSmtp.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.id).toBe('skipped-no-smtp');
    });

    it('should join array recipients with commas', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: '<msg-1>' });

      await service.send({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'a@test.com, b@test.com',
        }),
      );
    });
  });

  describe('sendBatch', () => {
    it('should send multiple emails and return results', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: '<msg-1>' })
        .mockResolvedValueOnce({ messageId: '<msg-2>' });

      const results = await service.sendBatch([
        { to: 'a@test.com', subject: 'A', html: '<p>A</p>' },
        { to: 'b@test.com', subject: 'B', html: '<p>B</p>' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('<msg-1>');
      expect(results[1].id).toBe('<msg-2>');
    });

    it('should handle partial failures gracefully', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: '<msg-1>' })
        .mockRejectedValueOnce(new Error('SMTP timeout'));

      const results = await service.sendBatch([
        { to: 'a@test.com', subject: 'A', html: '<p>A</p>' },
        { to: 'b@test.com', subject: 'B', html: '<p>B</p>' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('<msg-1>');
      expect(results[1].id).toBe('failed');
    });
  });
});
