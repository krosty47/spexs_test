import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TRPCModule } from 'nestjs-trpc';
import { AppContext } from './context';
import { AuthMiddleware } from './auth.middleware';
import { RateLimitMiddleware } from './rate-limit.middleware';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRATION'),
        },
      }),
    }),
    TRPCModule.forRoot({
      context: AppContext,
    }),
  ],
  providers: [AppContext, AuthMiddleware, RateLimitMiddleware],
  exports: [AuthMiddleware, RateLimitMiddleware],
})
export class TrpcModule {}
