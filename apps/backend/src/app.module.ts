import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { resolve } from 'path';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { TrpcModule } from './trpc/trpc.module';
import { AuthModule } from './features/auth/auth.module';
import { WorkflowsModule } from './features/workflows/workflows.module';
import { EventsModule } from './features/events/events.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { MailerModule } from './features/mailer';
import { DailySummaryModule } from './features/daily-summary/daily-summary.module';
import { ConfigFeatureModule } from './features/config/config.module';
import { UsersModule } from './features/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '..', '..', '..', '.env'),
      validate,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    TrpcModule,
    AuthModule,
    WorkflowsModule,
    EventsModule,
    NotificationsModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('SMTP_HOST'),
        port: configService.get<number>('SMTP_PORT'),
        secure: configService.get<boolean>('SMTP_SECURE'),
        user: configService.get<string>('SMTP_USER'),
        pass: configService.get<string>('SMTP_PASS'),
        defaultFrom: configService.get<string>('SMTP_FROM'),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    DailySummaryModule,
    ConfigFeatureModule,
    UsersModule,
  ],
})
export class AppModule {}
