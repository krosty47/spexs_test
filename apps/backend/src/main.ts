import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1_048_576 }), // 1 MB body limit
  );

  // Security headers — disable CSP in development to avoid blocking dev tools
  await app.register(helmet, {
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
          },
        },
  });

  // Register Fastify plugins
  await app.register(fastifyCookie);
  await app.register(fastifyCors, {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.info(`Backend running on http://localhost:${port}`);
}

bootstrap();
