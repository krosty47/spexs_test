/**
 * Resend Module
 * Reusable NestJS module for Resend email integration
 *
 * USAGE:
 * Import this module into your application with configuration
 *
 * @example Synchronous Configuration
 * ```typescript
 * @Module({
 *   imports: [
 *     ResendModule.forRoot({
 *       apiKey: process.env.RESEND_API_KEY,
 *       defaultFrom: 'noreply@yourdomain.com',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Asynchronous Configuration
 * ```typescript
 * @Module({
 *   imports: [
 *     ResendModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (configService: ConfigService) => ({
 *         apiKey: configService.get('RESEND_API_KEY'),
 *         defaultFrom: configService.get('MAIL_FROM'),
 *       }),
 *       inject: [ConfigService],
 *       isGlobal: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { Resend } from 'resend';

import { RESEND_CLIENT, RESEND_MODULE_OPTIONS } from './constants/resend.constants';
import {
  ResendModuleOptions,
  ResendModuleAsyncOptions,
  ResendModuleOptionsFactory,
} from './interfaces';
import { ResendEmailService } from './services';

/**
 * Main Resend Module
 * Provides email services with configuration
 */
@Global()
@Module({})
export class ResendModule {
  /**
   * Configure Resend module synchronously
   *
   * @param options Resend configuration options
   * @returns Dynamic module with Resend services
   */
  static forRoot(options: ResendModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: RESEND_MODULE_OPTIONS,
      useValue: options,
    };

    const resendClientProvider: Provider = {
      provide: RESEND_CLIENT,
      useFactory: (opts: ResendModuleOptions) => {
        return new Resend(opts.apiKey);
      },
      inject: [RESEND_MODULE_OPTIONS],
    };

    return {
      module: ResendModule,
      providers: [optionsProvider, resendClientProvider, ResendEmailService],
      exports: [RESEND_CLIENT, RESEND_MODULE_OPTIONS, ResendEmailService],
    };
  }

  /**
   * Configure Resend module asynchronously
   * Useful when configuration depends on other services (e.g., ConfigService)
   *
   * @param options Async configuration options
   * @returns Dynamic module with Resend services
   */
  static forRootAsync(options: ResendModuleAsyncOptions): DynamicModule {
    const resendClientProvider: Provider = {
      provide: RESEND_CLIENT,
      useFactory: (opts: ResendModuleOptions) => {
        if (!opts.apiKey) {
          return null;
        }
        return new Resend(opts.apiKey);
      },
      inject: [RESEND_MODULE_OPTIONS],
    };

    return {
      module: ResendModule,
      imports: options.imports || [],
      providers: [...this.createAsyncProviders(options), resendClientProvider, ResendEmailService],
      exports: [RESEND_CLIENT, RESEND_MODULE_OPTIONS, ResendEmailService],
      global: options.isGlobal ?? false,
    };
  }

  /**
   * Create async providers based on configuration strategy
   * @private
   */
  private static createAsyncProviders(options: ResendModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: RESEND_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: RESEND_MODULE_OPTIONS,
          useFactory: async (optionsFactory: ResendModuleOptionsFactory) => {
            return await optionsFactory.createResendOptions();
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
          provide: RESEND_MODULE_OPTIONS,
          useFactory: async (optionsFactory: ResendModuleOptionsFactory) => {
            return await optionsFactory.createResendOptions();
          },
          inject: [options.useExisting],
        },
      ];
    }

    return [];
  }
}

/**
 * Export service for easy importing
 */
export { ResendEmailService };

/**
 * Export all interfaces and types
 */
export * from './interfaces';
export * from './constants/resend.constants';
