/* eslint-disable no-console */
/**
 * Runs node-pg-migrate up against the direct (non-PgBouncer) Postgres URL.
 *
 *   yarn migrate:up            -> uses ./src/_migrations
 *
 * Used both by the release job (before web takes traffic) and by
 * AppModule.onApplicationBootstrap in dev.
 */
import 'dotenv/config';
import path from 'path';
import runner from 'node-pg-migrate';

export async function runMigrations(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or DATABASE_DIRECT_URL) must be set');
  }

  await runner({
    databaseUrl,
    dir: path.join(process.cwd(), 'src', '_migrations'),
    migrationsTable: 'pgmigrations',
    direction: 'up',
    count: Infinity,
    verbose: true,
    singleTransaction: false,
  });
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[migrate] all migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[migrate] failed', err);
      process.exit(1);
    });
}
