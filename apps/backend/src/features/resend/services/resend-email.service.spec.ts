import { Test, type TestingModule } from '@nestjs/testing';
import { TRPCError } from '@trpc/server';
import { ResendEmailService } from './resend-email.service';
import { RESEND_CLIENT, RESEND_MODULE_OPTIONS } from '../constants/resend.constants';
import type { ResendModuleOptions } from '../interfaces';

describe('ResendEmailService', () => {
  let service: ResendEmailService;
  let mockResend: { emails: { send: jest.Mock } };

  const defaultOptions: ResendModuleOptions = {
    apiKey: 'test-key',
    defaultFrom: 'noreply@test.com',
  };

  beforeEach(async () => {
    mockResend = {
      emails: {
        send: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendEmailService,
        { provide: RESEND_CLIENT, useValue: mockResend },
        { provide: RESEND_MODULE_OPTIONS, useValue: defaultOptions },
      ],
    }).compile();

    service = module.get<ResendEmailService>(ResendEmailService);
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await service.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.id).toBe('email-123');
    });

    it('should throw TRPCError INTERNAL_SERVER_ERROR when no "from" address is provided', async () => {
      // Create service with no defaultFrom and no resend client configured with default from
      const moduleNoFrom: TestingModule = await Test.createTestingModule({
        providers: [
          ResendEmailService,
          { provide: RESEND_CLIENT, useValue: mockResend },
          { provide: RESEND_MODULE_OPTIONS, useValue: { apiKey: 'test-key' } },
        ],
      }).compile();

      const serviceNoFrom = moduleNoFrom.get<ResendEmailService>(ResendEmailService);

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

    it('should throw TRPCError INTERNAL_SERVER_ERROR when Resend API fails', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

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
        message: 'Failed to send email: Rate limit exceeded',
      });
    });

    it('should skip sending when no API key is configured', async () => {
      const moduleNoKey: TestingModule = await Test.createTestingModule({
        providers: [
          ResendEmailService,
          { provide: RESEND_CLIENT, useValue: null },
          { provide: RESEND_MODULE_OPTIONS, useValue: { apiKey: undefined } },
        ],
      }).compile();

      const serviceNoKey = moduleNoKey.get<ResendEmailService>(ResendEmailService);

      const result = await serviceNoKey.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.id).toBe('skipped-no-api-key');
    });
  });
});
