import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsRouter } from './workflows.router';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { TrpcModule } from '../../trpc/trpc.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TrpcModule, EventsModule],
  providers: [WorkflowsService, WorkflowsRouter, TriggerEvaluationService],
  exports: [WorkflowsService, WorkflowsRouter],
})
export class WorkflowsModule {}
