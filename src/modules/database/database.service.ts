import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(DatabaseService.name);
  public readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    this.pool = new Pool({
      connectionString: url,
      // Keep app-side pool small — PgBouncer does the real pooling.
      max: Number(process.env.PG_APP_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      // Don't set statement_timeout at the startup-parameter level — PgBouncer
      // transaction-pool mode rejects it. We apply it at role level via
      // migration 1737000400000_db_role_settings.sql.
    });
    this.pool.on('error', (err) => {
      this.log.error(`pg pool error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit() {
    // Fail fast if the DB is unreachable at boot.
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      this.log.log('Postgres connection OK');
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
