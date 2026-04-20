import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { Role } from 'src/base/base.constants';

export interface TeamRow {
  id: string;
  plan: string;
  status: 'active' | 'paused' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  data: { name?: string; billing_email?: string };
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  status: 'active' | 'invited' | 'disabled';
  created_at: Date;
  data: Record<string, unknown>;
}

@Injectable()
export class TeamsRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async create(input: { name: string; billingEmail: string }): Promise<TeamRow> {
    const client = await this.getClient();
    const r = await client.query<TeamRow>(
      `INSERT INTO teams (plan, status, data)
       VALUES ('starter', 'active', $1::jsonb)
       RETURNING *`,
      [JSON.stringify({ name: input.name, billing_email: input.billingEmail })],
    );
    return r.rows[0];
  }

  async addMember(input: {
    teamId: string;
    userId: string;
    role: Role;
    status?: TeamMemberRow['status'];
  }): Promise<TeamMemberRow> {
    const client = await this.getClient();
    const r = await client.query<TeamMemberRow>(
      `INSERT INTO team_members (team_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.teamId, input.userId, input.role, input.status ?? 'active'],
    );
    return r.rows[0];
  }

  async findMembership(input: {
    userId: string;
  }): Promise<TeamMemberRow | null> {
    const client = await this.getClient();
    const r = await client.query<TeamMemberRow>(
      `SELECT * FROM team_members
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at
        LIMIT 1`,
      [input.userId],
    );
    return r.rows[0] ?? null;
  }
}
