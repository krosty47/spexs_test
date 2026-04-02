/**
 * Resend Module Configuration Interfaces
 */

import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';

/**
 * Main configuration interface for Resend module
 */
export interface ResendModuleOptions {
  /**
   * Resend API key (optional — email sending is disabled when not configured)
   */
  apiKey?: string;

  /**
   * Default "from" email address
   * @example 'noreply@yourdomain.com'
   */
  defaultFrom?: string;
}

/**
 * Interface for async configuration factory
 */
export interface ResendModuleOptionsFactory {
  createResendOptions(): Promise<ResendModuleOptions> | ResendModuleOptions;
}

/**
 * Interface for async module configuration
 */
export interface ResendModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Injection tokens for dependency injection
   */
  inject?: InjectionToken[];

  /**
   * Factory function to create options
   * Parameters are the injected dependencies
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...args: any[]) => Promise<ResendModuleOptions> | ResendModuleOptions;

  /**
   * Class that implements ResendModuleOptionsFactory
   */
  useClass?: Type<ResendModuleOptionsFactory>;

  /**
   * Existing provider to use
   */
  useExisting?: Type<ResendModuleOptionsFactory>;

  /**
   * Whether module should be global
   * @default false
   */
  isGlobal?: boolean;
}
