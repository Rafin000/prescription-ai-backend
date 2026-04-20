import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';

export interface SubscriptionRow {
  id: string;
  team_id: string;
  plan_id: 'starter' | 'pro' | 'clinic' | null;
  cycle: 'monthly' | 'yearly' | null;
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
  data: {
    amount_bdt?: number;
    last_tran_id?: string;
    cancel_at?: string;
    trial_ends_at?: string;
  };
}

@Injectable()
export class SubscriptionsRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async ensureFor(teamId: string): Promise<SubscriptionRow> {
    const client = await this.getClient();
    await client.query(
      `INSERT INTO subscriptions (team_id, status)
       VALUES ($1, 'none')
       ON CONFLICT (team_id) DO NOTHING`,
      [teamId],
    );
    const r = await client.query<SubscriptionRow>(
      `SELECT * FROM subscriptions WHERE team_id = $1 LIMIT 1`,
      [teamId],
    );
    return r.rows[0];
  }

  async recordCheckout(
    teamId: string,
    planId: 'starter' | 'pro' | 'clinic',
    cycle: 'monthly' | 'yearly',
    amountBdt: number,
    tranId: string,
  ): Promise<SubscriptionRow> {
    const now = new Date();
    const end = new Date(now);
    if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    const client = await this.getClient();
    const r = await client.query<SubscriptionRow>(
      `INSERT INTO subscriptions
         (team_id, plan_id, cycle, status, current_period_end, data)
       VALUES ($1, $2, $3, 'active', $4, $5::jsonb)
       ON CONFLICT (team_id) DO UPDATE
         SET plan_id            = EXCLUDED.plan_id,
             cycle              = EXCLUDED.cycle,
             status             = 'active',
             current_period_end = EXCLUDED.current_period_end,
             data               = subscriptions.data || EXCLUDED.data,
             updated_at         = now()
       RETURNING *`,
      [
        teamId,
        planId,
        cycle,
        end.toISOString(),
        JSON.stringify({ amount_bdt: amountBdt, last_tran_id: tranId }),
      ],
    );
    return r.rows[0];
  }
}
