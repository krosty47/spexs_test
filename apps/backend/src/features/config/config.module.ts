import { Module } from '@nestjs/common';
import { ConfigRouter } from './config.router';

@Module({
  providers: [ConfigRouter],
})
export class ConfigFeatureModule {}
