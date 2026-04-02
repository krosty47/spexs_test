import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { MAILER_TRANSPORT, MAILER_MODULE_OPTIONS } from './constants/mailer.constants';
import {
  MailerModuleOptions,
  MailerModuleAsyncOptions,
  MailerModuleOptionsFactory,
} from './interfaces';
import { MailerService } from './services';

@Global()
@Module({})
export class MailerModule {
  private static createTransportProvider(): Provider {
    return {
      provide: MAILER_TRANSPORT,
      useFactory: (opts: MailerModuleOptions) => {
        if (!opts.host) return null;
        return nodemailer.createTransport({
          host: opts.host,
          port: opts.port ?? 587,
          secure: opts.secure ?? false,
          auth: opts.user && opts.pass ? { user: opts.user, pass: opts.pass } : undefined,
        });
      },
      inject: [MAILER_MODULE_OPTIONS],
    };
  }

  static forRoot(options: MailerModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: MAILER_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: MailerModule,
      providers: [optionsProvider, this.createTransportProvider(), MailerService],
      exports: [MAILER_TRANSPORT, MAILER_MODULE_OPTIONS, MailerService],
    };
  }

  static forRootAsync(options: MailerModuleAsyncOptions): DynamicModule {
    return {
      module: MailerModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        this.createTransportProvider(),
        MailerService,
      ],
      exports: [MAILER_TRANSPORT, MAILER_MODULE_OPTIONS, MailerService],
      global: options.isGlobal ?? false,
    };
  }

  private static createAsyncProviders(options: MailerModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: MAILER_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: MAILER_MODULE_OPTIONS,
          useFactory: async (optionsFactory: MailerModuleOptionsFactory) => {
            return await optionsFactory.createMailerOptions();
          },
          inject: [options.useClass],
        },
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: MAILER_MODULE_OPTIONS,
          useFactory: async (optionsFactory: MailerModuleOptionsFactory) => {
            return await optionsFactory.createMailerOptions();
          },
          inject: [options.useExisting],
        },
      ];
    }

    return [];
  }
}

export { MailerService };
export * from './interfaces';
export * from './constants/mailer.constants';
