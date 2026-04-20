import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
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

export interface TeamMemberWithUser extends TeamMemberRow {
  email: string | null;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_owner: boolean;
}

@Injectable()
export class TeamsRepository extends BaseRepository {
  private readonly LIST_MEMBERS_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_MEMBERS_SQL = readFileSync(
      join(__dirname, 'queries/list-members.sql'),
      'utf-8',
    );
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

  async findTeam(teamId: string): Promise<TeamRow | null> {
    const client = await this.getClient();
    const r = await client.query<TeamRow>(
      `SELECT * FROM teams WHERE id = $1 LIMIT 1`,
      [teamId],
    );
    return r.rows[0] ?? null;
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

  async listMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const client = await this.getClient();
    const r = await client.query<TeamMemberWithUser>(this.LIST_MEMBERS_SQL, [teamId]);
    return r.rows;
  }

  async findMemberByUserId(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberRow | null> {
    const client = await this.getClient();
    const r = await client.query<TeamMemberRow>(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 LIMIT 1`,
      [teamId, userId],
    );
    return r.rows[0] ?? null;
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    role: Role,
  ): Promise<TeamMemberRow> {
    const client = await this.getClient();
    const r = await client.query<TeamMemberRow>(
      `UPDATE team_members SET role = $3
        WHERE team_id = $1 AND user_id = $2
        RETURNING *`,
      [teamId, userId, role],
    );
    if (!r.rows.length) throw new NotFoundException('Member not found');
    return r.rows[0];
  }

  async disableMember(teamId: string, userId: string): Promise<void> {
    const client = await this.getClient();
    const r = await client.query(
      `UPDATE team_members SET status = 'disabled'
        WHERE team_id = $1 AND user_id = $2
        RETURNING id`,
      [teamId, userId],
    );
    if (!r.rowCount) throw new NotFoundException('Member not found');
  }
}
