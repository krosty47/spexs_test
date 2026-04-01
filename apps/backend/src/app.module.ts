import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { TrpcModule } from './trpc/trpc.module';
import { AuthModule } from './features/auth/auth.module';
import { WorkflowsModule } from './features/workflows/workflows.module';
import { EventsModule } from './features/events/events.module';
import { NotificationsModule } from './features/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '..', '..', '..', '.env'),
      validate,
    }),
    PrismaModule,
    TrpcModule,
    AuthModule,
    WorkflowsModule,
    EventsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
