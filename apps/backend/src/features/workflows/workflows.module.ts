import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsRouter } from './workflows.router';
import { TrpcModule } from '../../trpc/trpc.module';

@Module({
  imports: [TrpcModule],
  providers: [WorkflowsService, WorkflowsRouter],
  exports: [WorkflowsService, WorkflowsRouter],
})
export class WorkflowsModule {}
