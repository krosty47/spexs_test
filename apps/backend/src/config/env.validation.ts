import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('1h'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@workflow.dev'),
  DAILY_SUMMARY_TO: z.string().email().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.format();
    throw new Error(`Environment validation failed: ${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}
