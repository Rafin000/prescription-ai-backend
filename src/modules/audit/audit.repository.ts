import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { AuditResource, AuditRow } from './types/audit.model';
import { auditResource } from './transformers/audit.resource';

export interface AppendAuditInput {
  teamId: string;
  actorUserId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  ip: string | null;
  method: string;
  path: string;
  requestId: string | null;
  userAgent: string | null;
  statusCode: number;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

@Injectable()
export class AuditRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  /**
   * Append an audit row with the hash of (prev_hash + payload) so the chain
   * is tamper-evident. Per-team head via `ORDER BY ts DESC LIMIT 1`.
   */
  async append(input: AppendAuditInput): Promise<void> {
    const client = await this.getClient();

    const prev = await client.query<{ hash: string | null }>(
      `SELECT data->>'hash' AS hash
         FROM audit_log
        WHERE team_id = $1
        ORDER BY ts DESC
        LIMIT 1`,
      [input.teamId],
    );
    const prevHash = prev.rows[0]?.hash ?? null;

    const payload = JSON.stringify({
      teamId: input.teamId,
      actor: input.actorUserId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      body: input.body ?? null,
      query: input.query ?? null,
    });
    const hash = createHash('sha256')
      .update((prevHash ?? '') + payload)
      .digest('hex');

    await client.query(
      `INSERT INTO audit_log
         (team_id, actor_user_id, resource_type, resource_id, action,
          ip, prev_hash, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        input.teamId,
        input.actorUserId,
        input.resourceType,
        input.resourceId,
        input.action,
        input.ip,
        prevHash,
        JSON.stringify({
          hash,
          method: input.method,
          path: input.path,
          request_id: input.requestId,
          user_agent: input.userAgent,
          status_code: input.statusCode,
          body: input.body ?? null,
          query: input.query ?? null,
        }),
      ],
    );
  }

  async listForTeam(
    teamId: string,
    limit = 100,
  ): Promise<AuditResource[]> {
    const client = await this.getClient();
    const r = await client.query<AuditRow>(
      `SELECT * FROM audit_log
        WHERE team_id = $1
        ORDER BY ts DESC
        LIMIT $2`,
      [teamId, Math.min(limit, 500)],
    );
    return auditResource.transformCollection(r.rows);
  }
}
