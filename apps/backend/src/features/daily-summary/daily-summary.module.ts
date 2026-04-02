import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { DailySummaryService } from './daily-summary.service';

@Module({
  imports: [PrismaModule],
  providers: [DailySummaryService],
})
export class DailySummaryModule {}
