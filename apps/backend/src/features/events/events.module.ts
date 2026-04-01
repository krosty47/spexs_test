import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRouter } from './events.router';
import { TrpcModule } from '../../trpc/trpc.module';

@Module({
  imports: [TrpcModule],
  providers: [EventsService, EventsRouter],
  exports: [EventsService, EventsRouter],
})
export class EventsModule {}
