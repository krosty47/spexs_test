import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRouter } from './auth.router';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TrpcModule } from '../../trpc/trpc.module';

@Module({
  imports: [
    PassportModule,
    TrpcModule,
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
  ],
  providers: [AuthService, AuthRouter, JwtStrategy],
  exports: [AuthService, AuthRouter],
})
export class AuthModule {}
