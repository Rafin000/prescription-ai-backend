import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLS_REQUEST_ID } from 'src/base/base.constants';

/**
 * Uniform error shape across every route: { error, code, requestId, details? }.
 * Domain errors throw HttpException subclasses (NotFound, BadRequest, Forbidden).
 * Unknown errors are surfaced as 500s with a generic message — real details go
 * to the logs, keyed by requestId.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(HttpExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId = this.cls.get<string>(CLS_REQUEST_ID);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const { error, code, details } = normalize(body, exception.message);
      res.status(status).json({ error, code, requestId, details });
      return;
    }

    this.log.error(
      `Unhandled error on ${req?.method} ${req?.url}: ${
        (exception as Error)?.message ?? exception
      }`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      code: 'INTERNAL',
      requestId,
    });
  }
}

function normalize(
  body: string | object,
  fallback: string,
): { error: string; code: string; details?: unknown } {
  if (typeof body === 'string') {
    return { error: body || fallback, code: slugify(body || fallback) };
  }
  const b = body as { message?: unknown; error?: string; code?: string; details?: unknown };
  const error = Array.isArray(b.message)
    ? b.message.join('; ')
    : (b.message as string | undefined) ?? b.error ?? fallback;
  const code = b.code ?? slugify(b.error ?? error);
  return { error, code, details: b.details };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'unknown';
}
