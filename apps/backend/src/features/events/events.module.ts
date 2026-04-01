import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRouter } from './events.router';
import { SnoozeExpirationService } from './snooze-expiration.service';
import { TrpcModule } from '../../trpc/trpc.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TrpcModule, NotificationsModule],
  providers: [EventsService, EventsRouter, SnoozeExpirationService],
  exports: [EventsService, EventsRouter],
})
export class EventsModule {}
