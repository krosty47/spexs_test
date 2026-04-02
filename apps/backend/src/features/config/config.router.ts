import { Router, Query, UseMiddlewares } from 'nestjs-trpc';
import { ConfigService } from '@nestjs/config';
import { appConfigOutputSchema } from '@workflow-manager/shared';
import { AuthMiddleware } from '../../trpc/auth.middleware';

@Router({ alias: 'config' })
@UseMiddlewares(AuthMiddleware)
export class ConfigRouter {
  constructor(private readonly configService: ConfigService) {}

  @Query({ output: appConfigOutputSchema })
  async getFeatures() {
    return {
      emailEnabled: !!this.configService.get<string>('SMTP_HOST'),
    };
  }
}
