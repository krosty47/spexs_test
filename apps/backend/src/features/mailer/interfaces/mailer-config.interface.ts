import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';

export interface MailerModuleOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  defaultFrom?: string;
}

export interface MailerModuleOptionsFactory {
  createMailerOptions(): Promise<MailerModuleOptions> | MailerModuleOptions;
}

export interface MailerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: InjectionToken[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...args: any[]) => Promise<MailerModuleOptions> | MailerModuleOptions;
  useClass?: Type<MailerModuleOptionsFactory>;
  useExisting?: Type<MailerModuleOptionsFactory>;
  isGlobal?: boolean;
}
