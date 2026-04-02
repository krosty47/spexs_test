import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DailySummaryService } from './daily-summary.service';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from '../mailer';

describe('DailySummaryService', () => {
  let service: DailySummaryService;
  let prisma: { event: { groupBy: jest.Mock }; workflow: { findMany: jest.Mock } };
  let mailerService: { send: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      event: { groupBy: jest.fn() },
      workflow: { findMany: jest.fn() },
    };

    mailerService = {
      send: jest.fn().mockResolvedValue({ id: 'email-1' }),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.test.dev';
        if (key === 'SMTP_FROM') return 'noreply@test.dev';
        if (key === 'DAILY_SUMMARY_TO') return 'admin@test.dev';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailySummaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailerService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DailySummaryService>(DailySummaryService);
  });

  describe('generateSummary', () => {
    it('should skip email when there are 0 events in the last 24 hours', async () => {
      prisma.event.groupBy.mockResolvedValue([]);

      await service.generateSummary();

      expect(mailerService.send).not.toHaveBeenCalled();
    });

    it('should aggregate events by workflow and status and send email', async () => {
      prisma.event.groupBy.mockResolvedValue([
        { workflowId: 'wf-1', status: 'OPEN', _count: { id: 3 } },
        { workflowId: 'wf-1', status: 'RESOLVED', _count: { id: 2 } },
        { workflowId: 'wf-2', status: 'SNOOZED', _count: { id: 1 } },
      ]);

      prisma.workflow.findMany.mockResolvedValue([
        { id: 'wf-1', name: 'CPU Alert' },
        { id: 'wf-2', name: 'Memory Monitor' },
      ]);

      await service.generateSummary();

      expect(mailerService.send).toHaveBeenCalledTimes(1);
      const emailArgs = mailerService.send.mock.calls[0][0];
      expect(emailArgs.subject).toContain('Daily Event Summary');
      expect(emailArgs.html).toContain('CPU Alert');
      expect(emailArgs.html).toContain('Memory Monitor');
    });

    it('should handle mailer failure gracefully', async () => {
      prisma.event.groupBy.mockResolvedValue([
        { workflowId: 'wf-1', status: 'OPEN', _count: { id: 1 } },
      ]);
      prisma.workflow.findMany.mockResolvedValue([{ id: 'wf-1', name: 'CPU Alert' }]);

      mailerService.send.mockRejectedValue(new Error('SMTP error'));

      // Should not throw -- graceful degradation
      await expect(service.generateSummary()).resolves.not.toThrow();
    });

    it('should skip email when SMTP_HOST is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return undefined;
        return undefined;
      });

      await service.generateSummary();

      expect(prisma.event.groupBy).not.toHaveBeenCalled();
      expect(mailerService.send).not.toHaveBeenCalled();
    });

    it('should send to configured recipient email', async () => {
      prisma.event.groupBy.mockResolvedValue([
        { workflowId: 'wf-1', status: 'OPEN', _count: { id: 5 } },
      ]);
      prisma.workflow.findMany.mockResolvedValue([{ id: 'wf-1', name: 'Test Workflow' }]);

      await service.generateSummary();

      const emailArgs = mailerService.send.mock.calls[0][0];
      expect(emailArgs.to).toBe('admin@test.dev');
    });

    it('should skip email when DAILY_SUMMARY_TO is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.test.dev';
        return undefined;
      });

      prisma.event.groupBy.mockResolvedValue([
        { workflowId: 'wf-1', status: 'OPEN', _count: { id: 5 } },
      ]);
      prisma.workflow.findMany.mockResolvedValue([{ id: 'wf-1', name: 'Test Workflow' }]);

      await service.generateSummary();

      expect(mailerService.send).not.toHaveBeenCalled();
    });
  });
});
