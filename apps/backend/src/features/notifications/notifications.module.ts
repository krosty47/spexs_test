import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { NotificationsRouter } from './notifications.router';
import { TrpcModule } from '../../trpc/trpc.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TrpcModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRouter, JwtCookieGuard],
  exports: [NotificationsService, NotificationsRouter],
})
export class NotificationsModule {}
