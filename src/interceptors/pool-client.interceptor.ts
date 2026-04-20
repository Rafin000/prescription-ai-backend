import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable, from, mergeMap, catchError, finalize, throwError } from 'rxjs';
import { CLS_POOL_CLIENT } from 'src/base/base.constants';
import { DatabaseService } from 'src/modules/database/database.service';

/**
 * Checks out one PoolClient per request, stores it in CLS, wraps the handler
 * in BEGIN/COMMIT/ROLLBACK. Every repository reuses this client via
 * BaseRepository.getClient() — so multi-repo writes are atomic with no plumbing.
 *
 * Read-only requests pay the cost of BEGIN/COMMIT on one connection; we'll
 * introduce a @ReadOnly() decorator that skips transaction wrapping when
 * profiling shows it matters.
 */
@Injectable()
export class PoolClientInterceptor implements NestInterceptor {
  private readonly log = new Logger(PoolClientInterceptor.name);

  constructor(
    private readonly cls: ClsService,
    private readonly db: DatabaseService,
  ) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.db.pool.connect()).pipe(
      mergeMap((client) => {
        this.cls.set(CLS_POOL_CLIENT, client);
        return from(client.query('BEGIN')).pipe(
          mergeMap(() => next.handle()),
          mergeMap(async (result) => {
            await client.query('COMMIT');
            return result;
          }),
          catchError((err) =>
            from(client.query('ROLLBACK').catch(() => undefined)).pipe(
              mergeMap(() => throwError(() => err)),
            ),
          ),
          finalize(() => {
            try {
              client.release();
            } catch (e) {
              this.log.warn(`client.release failed: ${(e as Error).message}`);
            }
          }),
        );
      }),
    );
  }
}
