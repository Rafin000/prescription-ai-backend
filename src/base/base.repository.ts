import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PoolClient } from 'pg';
import { CLS_POOL_CLIENT } from './base.constants';
import { DatabaseService } from 'src/modules/database/database.service';

@Injectable()
export class BaseRepository {
  constructor(
    protected readonly cls: ClsService,
    protected readonly db: DatabaseService,
  ) {}

  /**
   * Returns the per-request PoolClient stashed in CLS by PoolClientInterceptor.
   * All repo methods use this — one connection per request, auto-transactional.
   */
  protected async getClient(): Promise<PoolClient> {
    const c = this.cls.get<PoolClient>(CLS_POOL_CLIENT);
    if (!c) {
      throw new Error(
        'No pg client in request context. Is PoolClientInterceptor registered?',
      );
    }
    return c;
  }
}
