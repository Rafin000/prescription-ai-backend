import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';

export type UsageKind =
  | 'transcription'
  | 'ai-fill'
  | 'talk-to-ai'
  | 'summary'
  | 'other';

export interface UsageEventRow {
  id: string;
  team_id: string;
  consult_id: string | null;
  kind: UsageKind;
  tokens: number;
  cost_bdt: string | number;
  idempotency_key: string;
  ts: Date;
  data: {
    provider?: string;
    model?: string;
    session_id?: string;
    patient_id?: string;
    patient_name?: string;
    summary?: string;
  };
}

export interface ByKindTotal {
  kind: UsageKind;
  tokens: number;
  cost_bdt: string;
}

export interface DailyTotal {
  date: string; // YYYY-MM-DD
  tokens: number;
  cost_bdt: string;
}

@Injectable()
export class UsageRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async list(
    teamId: string,
    params: { from?: Date; to?: Date; kind?: UsageKind; limit?: number },
  ): Promise<UsageEventRow[]> {
    const client = await this.getClient();
    const r = await client.query<UsageEventRow>(
      `SELECT * FROM usage_events
        WHERE team_id = $1
          AND ts >= COALESCE($2, now() - interval '30 days')
          AND ts <= COALESCE($3, now())
          AND ($4::text IS NULL OR kind = $4::text)
        ORDER BY ts DESC
        LIMIT LEAST(COALESCE($5::int, 200), 500)`,
      [teamId, params.from ?? null, params.to ?? null, params.kind ?? null, params.limit ?? null],
    );
    return r.rows;
  }

  async byKind(teamId: string, from: Date, to: Date): Promise<ByKindTotal[]> {
    const client = await this.getClient();
    const r = await client.query<ByKindTotal>(
      `SELECT kind,
              COALESCE(SUM(tokens), 0)::int AS tokens,
              COALESCE(SUM(cost_bdt), 0)::text AS cost_bdt
         FROM usage_events
        WHERE team_id = $1 AND ts BETWEEN $2 AND $3
        GROUP BY kind`,
      [teamId, from, to],
    );
    return r.rows;
  }

  async daily(teamId: string, from: Date, to: Date): Promise<DailyTotal[]> {
    const client = await this.getClient();
    const r = await client.query<DailyTotal>(
      `SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS date,
              COALESCE(SUM(tokens), 0)::int AS tokens,
              COALESCE(SUM(cost_bdt), 0)::text AS cost_bdt
         FROM usage_events
        WHERE team_id = $1 AND ts BETWEEN $2 AND $3
        GROUP BY 1
        ORDER BY 1`,
      [teamId, from, to],
    );
    return r.rows;
  }

  async totals(
    teamId: string,
    from: Date,
    to: Date,
  ): Promise<{ totalTokens: number; totalCostBdt: string; eventsCount: number }> {
    const client = await this.getClient();
    const r = await client.query<{
      total_tokens: string;
      total_cost_bdt: string;
      events_count: string;
    }>(
      `SELECT COALESCE(SUM(tokens), 0)::text AS total_tokens,
              COALESCE(SUM(cost_bdt), 0)::text AS total_cost_bdt,
              COUNT(*)::text AS events_count
         FROM usage_events
        WHERE team_id = $1 AND ts BETWEEN $2 AND $3`,
      [teamId, from, to],
    );
    return {
      totalTokens: Number(r.rows[0].total_tokens),
      totalCostBdt: r.rows[0].total_cost_bdt,
      eventsCount: Number(r.rows[0].events_count),
    };
  }
}
