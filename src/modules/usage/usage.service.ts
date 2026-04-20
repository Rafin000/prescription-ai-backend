import { Injectable } from '@nestjs/common';
import { UsageKind, UsageRepository } from './usage.repository';

const USAGE_KIND_LABEL: Record<UsageKind, string> = {
  transcription: 'Live transcription',
  'ai-fill': 'Rx auto-fill',
  'talk-to-ai': 'Talk-to-AI commands',
  summary: 'Visit summaries',
  other: 'Other',
};

@Injectable()
export class UsageService {
  constructor(private readonly repo: UsageRepository) {}

  async summary(teamId: string) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const [totals, byKindRows, dailyRows] = await Promise.all([
      this.repo.totals(teamId, from, now),
      this.repo.byKind(teamId, from, now),
      this.repo.daily(teamId, from, now),
    ]);

    const byKind = Object.fromEntries(
      (Object.keys(USAGE_KIND_LABEL) as UsageKind[]).map((k) => {
        const row = byKindRows.find((r) => r.kind === k);
        return [
          k,
          {
            tokens: row ? Number(row.tokens) : 0,
            costBdt: row ? Number(row.cost_bdt) : 0,
          },
        ];
      }),
    );

    return {
      periodStart: from.toISOString(),
      periodEnd: now.toISOString(),
      totalTokens: totals.totalTokens,
      totalCostBdt: Number(totals.totalCostBdt),
      eventsCount: totals.eventsCount,
      byKind,
      daily: dailyRows.map((d) => ({
        date: d.date,
        tokens: Number(d.tokens),
        costBdt: Number(d.cost_bdt),
      })),
    };
  }

  async list(
    teamId: string,
    params: { from?: string; to?: string; kind?: UsageKind; limit?: number },
  ) {
    const rows = await this.repo.list(teamId, {
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      kind: params.kind,
      limit: params.limit,
    });
    return rows.map((r) => ({
      id: r.id,
      at: r.ts.toISOString(),
      kind: r.kind,
      tokens: r.tokens,
      costBdt: Number(r.cost_bdt),
      sessionId: r.data.session_id,
      patientId: r.data.patient_id,
      patientName: r.data.patient_name,
      summary: r.data.summary,
    }));
  }
}
