import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
    status = exception.getStatus();
    const res = exception.getResponse();
    message = typeof res === 'string' ? res : (res as any).message || res;
    } else if (exception instanceof QueryFailedError) {
      const err = exception as QueryFailedError & { code?: string; detail?: string };
      this.logger.error(`[DBError] ${err.message}`);
      message = 'Unexpected database error';
    }

    // Format message
    const errorResponse =
      typeof message === 'string'
        ? { message }
        : { ...(message as Record<string, any>) };

    // logging
    const reqId = (request as any)?.requestId || 'NO_REQUEST_ID';
    this.logger.error(
    `[${reqId}] [${request.method}] ${request.url} - ${JSON.stringify(errorResponse)}`,
    (exception as any)?.stack || '',
    );

    response.status(status).json({
    statusCode: status,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
    requestId: reqId,
    error: typeof (errorResponse as any).message !== 'undefined'
        ? (errorResponse as any).message
        : (errorResponse as any).error || message,
    });
  }
}
