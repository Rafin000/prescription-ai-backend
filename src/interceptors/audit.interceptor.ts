import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable, tap } from 'rxjs';
import { CLS_REQUEST_ID } from 'src/base/base.constants';
import { AuditRepository } from 'src/modules/audit/audit.repository';
import { AuthedUser } from 'src/decorators/current-user.decorator';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Paths that are noisy, unauthenticated, or don't warrant per-row audit.
// Public webhooks still get audited (team_id is on the resource row).
const SKIP_PREFIXES = [
  '/api/health',
  '/api/auth/refresh',
  '/api/notifications/',          // bell marks don't need an audit trail
  '/api/join/',                   // guest presence flips — noisy
  '/api/public/symptom-suggest',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly log = new Logger(AuditInterceptor.name);
  constructor(
    private readonly cls: ClsService,
    private readonly repo: AuditRepository,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (ctx.getType() !== 'http') return next.handle();
    if (!MUTATING.has((req.method ?? '').toUpperCase())) return next.handle();
    if (SKIP_PREFIXES.some((p) => (req.url ?? '').startsWith(p))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        // Fire and forget — never fail the request if audit write fails.
        this.writeAudit(req, res, result).catch((e) =>
          this.log.warn(`audit write failed: ${(e as Error).message}`),
        );
      }),
    );
  }

  private async writeAudit(
    req: {
      method: string;
      url: string;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      user?: AuthedUser;
      body?: unknown;
      query?: Record<string, unknown>;
    },
    res: { statusCode: number },
    result: unknown,
  ) {
    const user = req.user as AuthedUser | undefined;
    // Derive teamId: authed from JWT; else from the returned resource; else
    // a sentinel so we still capture the public action.
    const body = (result ?? {}) as Record<string, unknown>;
    const teamFromBody =
      body && typeof body === 'object' && 'teamId' in body
        ? String((body as { teamId?: unknown }).teamId ?? '')
        : '';
    const teamId =
      user?.teamId ||
      teamFromBody ||
      '00000000-0000-0000-0000-000000000000';

    const { resourceType, resourceId, action } = this.routeToAction(
      req.method,
      req.url,
      body,
    );

    await this.repo.append({
      teamId,
      actorUserId: user?.userId ?? null,
      resourceType,
      resourceId,
      action,
      ip: (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? null)
        ?.toString()
        ?.slice(0, 45),
      method: req.method,
      path: req.url,
      requestId: this.cls.get<string>(CLS_REQUEST_ID) ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
      statusCode: res.statusCode,
      body: this.redact(req.body as Record<string, unknown> | undefined),
      query: req.query,
    });
  }

  private routeToAction(
    method: string,
    url: string,
    result: Record<string, unknown>,
  ): { resourceType: string; resourceId: string; action: string } {
    // /api/prefix/...remaining — derive resource type from the first segment
    // after /api, and the id from URL params / the returned resource.
    const clean = url.split('?')[0];
    const parts = clean.replace(/^\/api\//, '').split('/').filter(Boolean);
    const resourceType = parts[0] ?? 'unknown';
    const resourceId =
      (typeof result.id === 'string' && result.id) ||
      parts.slice(1).find((p) => /^[0-9a-f-]{16,}$/i.test(p)) ||
      '';
    const actionMap: Record<string, string> = {
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    return {
      resourceType,
      resourceId,
      action: actionMap[method] ?? method.toLowerCase(),
    };
  }

  /** Don't persist raw passwords/tokens in the audit log body. */
  private redact(body?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const REDACTED = '[redacted]';
    const out: Record<string, unknown> = { ...body };
    for (const k of Object.keys(out)) {
      if (/password|token|secret|authorization|cookie/i.test(k)) {
        out[k] = REDACTED;
      }
    }
    return out;
  }
}
