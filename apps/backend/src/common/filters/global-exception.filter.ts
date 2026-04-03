import { Catch, type ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Global exception filter for non-tRPC errors.
 *
 * tRPC handles its own errors before they reach this filter, so we only
 * catch HttpExceptions and unknown errors that escape the tRPC layer.
 * Provides structured logging and strips stack traces.
 */
@Catch()
export class GlobalExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const isProduction = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>).message as string) || exception.message;
    }

    // Log unknown errors (non-HttpException) for debugging
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception on ${request?.method} ${request?.url}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    // Include stack trace only in non-production for debugging
    if (!isProduction && exception instanceof Error) {
      body.stack = exception.stack;
    }

    response.status(status).send(body);
  }
}
