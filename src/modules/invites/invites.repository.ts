import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  InviteResource,
  InviteRow,
  InviteStatus,
  PublicInviteResource,
} from './types/invite.model';
import { inviteResource } from './transformers/invite.resource';

@Injectable()
export class InvitesRepository extends BaseRepository {
  private readonly LIST_SQL: string;
  private readonly GET_PUBLIC_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_SQL = readFileSync(
      join(__dirname, 'queries/list-invites.sql'),
      'utf-8',
    );
    this.GET_PUBLIC_SQL = readFileSync(
      join(__dirname, 'queries/get-public-invite.sql'),
      'utf-8',
    );
  }

  async create(input: {
    teamId: string;
    email: string;
    role: string;
    invitedBy: string;
    token: string;
    expiresAt: Date;
    message?: string;
  }): Promise<InviteResource> {
    const client = await this.getClient();
    const r = await client.query<InviteRow>(
      `INSERT INTO invites
         (team_id, email, role, token, invited_by, expires_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.email,
        input.role,
        input.token,
        input.invitedBy,
        input.expiresAt.toISOString(),
        JSON.stringify({ message: input.message ?? null }),
      ],
    );
    return this.hydrate(r.rows[0]);
  }

  async list(teamId: string): Promise<InviteResource[]> {
    const client = await this.getClient();
    const r = await client.query<InviteRow & { invited_by_name: string | null }>(
      this.LIST_SQL,
      [teamId],
    );
    return inviteResource.transformCollection(r.rows);
  }

  async findRowByToken(token: string): Promise<
    (InviteRow & { invited_by_name: string | null; team_name: string | null }) | null
  > {
    const client = await this.getClient();
    const r = await client.query<
      InviteRow & { invited_by_name: string | null; team_name: string | null }
    >(this.GET_PUBLIC_SQL, [token]);
    return r.rows[0] ?? null;
  }

  async findById(teamId: string, id: string): Promise<InviteRow | null> {
    const client = await this.getClient();
    const r = await client.query<InviteRow>(
      `SELECT * FROM invites WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }

  async setStatus(
    id: string,
    status: InviteStatus,
    merge?: Record<string, unknown>,
  ): Promise<InviteResource> {
    const client = await this.getClient();
    const r = await client.query<InviteRow>(
      `UPDATE invites SET
          status = $2,
          accepted_at = CASE WHEN $2 = 'accepted' THEN now() ELSE accepted_at END,
          data = CASE WHEN $3::jsonb IS NULL THEN data ELSE data || $3::jsonb END,
          updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [id, status, merge ? JSON.stringify(merge) : null],
    );
    if (!r.rows.length) throw new NotFoundException('Invite not found');
    return this.hydrate(r.rows[0]);
  }

  async refreshToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<InviteResource> {
    const client = await this.getClient();
    const r = await client.query<InviteRow>(
      `UPDATE invites SET
          token = $2,
          expires_at = $3,
          status = 'pending',
          data = data || $4::jsonb,
          updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [
        id,
        token,
        expiresAt.toISOString(),
        JSON.stringify({ resent_at: new Date().toISOString() }),
      ],
    );
    if (!r.rows.length) throw new NotFoundException('Invite not found');
    return this.hydrate(r.rows[0]);
  }

  /** Public-safe shape: drop the team_id, only expose display names. */
  toPublic(
    row: InviteRow & { invited_by_name: string | null; team_name: string | null },
  ): PublicInviteResource {
    return {
      token: row.token,
      email: row.email,
      role: row.role,
      team: { name: row.team_name ?? 'Your clinic' },
      invitedBy: { name: row.invited_by_name ?? 'A team member' },
      expiresAt: row.expires_at.toISOString(),
      status: row.status,
    };
  }

  private async hydrate(row: InviteRow): Promise<InviteResource> {
    const client = await this.getClient();
    const r = await client.query<{ name: string | null }>(
      `SELECT data->>'name' AS name FROM users WHERE id = $1`,
      [row.invited_by],
    );
    return inviteResource.transform({
      ...row,
      invited_by_name: r.rows[0]?.name ?? null,
    });
  }
}
