import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from 'src/modules/database/database.service';

const PARTITIONED_TABLES = [
  'audit_log',
  'usage_events',
  'cost_events',
  'notifications',
];

/**
 * Ensures next month's partition exists for every partitioned table.
 * Runs once at boot + daily at 02:00 UTC so the next-month partition is
 * always in place well before the first row of the new month arrives.
 *
 * Uses pool.connect() directly — this runs outside any request, so there's
 * no CLS-scoped PoolClient to borrow. In prod this lives on the single
 * cron replica once we split main.worker out.
 */
@Injectable()
export class PartitionService implements OnApplicationBootstrap {
  private readonly log = new Logger(PartitionService.name);

  constructor(private readonly db: DatabaseService) {}

  async onApplicationBootstrap() {
    await this.ensureCurrentAndNext().catch((e) =>
      this.log.error(`partition bootstrap failed: ${(e as Error).message}`),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'partition:ensure' })
  async ensureDaily(): Promise<void> {
    await this.ensureMonth(nextMonthFirst());
  }

  async ensureCurrentAndNext(): Promise<void> {
    await this.ensureMonth(thisMonthFirst());
    await this.ensureMonth(nextMonthFirst());
  }

  private async ensureMonth(firstOfMonth: Date): Promise<void> {
    const iso = firstOfMonth.toISOString().slice(0, 10);
    const client = await this.db.pool.connect();
    try {
      for (const t of PARTITIONED_TABLES) {
        await client.query(`SELECT ensure_month_partition($1::regclass, $2::date)`, [
          t,
          iso,
        ]);
      }
      this.log.log(`ensured partitions for ${iso}`);
    } finally {
      client.release();
    }
  }
}

function thisMonthFirst(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextMonthFirst(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
