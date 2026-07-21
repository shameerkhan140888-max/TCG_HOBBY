import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { PublicApiError, PublicApiErrorCode } from '@tcg-hobby/types';

function codeForStatus(status: number): PublicApiErrorCode {
  if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) return 'UNAUTHORISED';
  if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'CONFLICT';
  if (status >= 400 && status < 500) return 'VALIDATION';
  return 'SERVER';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status(code: number): { json(body: PublicApiError): void } }>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message[0]
          : String(payload.message)
        : status >= 500
          ? 'The service is temporarily unavailable. Please try again.'
          : 'The request could not be completed.';

    if (status >= 500 && process.env.NODE_ENV !== 'production') {
      console.error('public_api_request_failed', exception instanceof Error ? { name: exception.name, message: exception.message, stack: exception.stack } : { exceptionType: typeof exception });
    }

    response.status(status).json({ code: codeForStatus(status), message });
  }
}
