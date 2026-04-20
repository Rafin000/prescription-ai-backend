import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  NotificationChannel,
  NotificationResource,
  NotificationRow,
  NotificationStatus,
} from './types/notification.model';
import { notificationResource } from './transformers/notification.resource';

export interface InsertNotificationInput {
  teamId: string;
  userId?: string | null;
  kind: string;
  channel: NotificationChannel;
  recipient: string;
  dedupeKey: string;
  status?: NotificationStatus;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  /**
   * Insert-or-skip on `dedupe_key` — retries collapse, callers don't need to
   * pre-check. Returns the row (new or existing).
   */
  async insert(input: InsertNotificationInput): Promise<NotificationRow> {
    const client = await this.getClient();
    const r = await client.query<NotificationRow>(
      `INSERT INTO notifications
         (team_id, user_id, kind, channel, recipient, status, dedupe_key, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (dedupe_key, ts) DO NOTHING
       RETURNING *`,
      [
        input.teamId,
        input.userId ?? null,
        input.kind,
        input.channel,
        input.recipient,
        input.status ?? 'pending',
        input.dedupeKey,
        JSON.stringify(input.data ?? {}),
      ],
    );
    if (r.rows[0]) return r.rows[0];
    // Conflict — fetch the existing one so callers still get a row.
    const e = await client.query<NotificationRow>(
      `SELECT * FROM notifications WHERE dedupe_key = $1 ORDER BY ts DESC LIMIT 1`,
      [input.dedupeKey],
    );
    return e.rows[0];
  }

  async markResult(
    id: string,
    ts: Date,
    result: { status: NotificationStatus; providerResponse?: unknown; error?: string },
  ): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE notifications
          SET status = $3,
              data   = data || $4::jsonb
        WHERE id = $1 AND ts = $2`,
      [
        id,
        ts,
        result.status,
        JSON.stringify({
          provider_response: result.providerResponse,
          error: result.error,
        }),
      ],
    );
  }

  async listForUser(
    teamId: string,
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationResource[]> {
    const client = await this.getClient();
    const r = await client.query<NotificationRow>(
      `SELECT * FROM notifications
        WHERE team_id = $1
          AND channel = 'in-app'
          AND user_id = $2
          AND ($3::bool IS FALSE OR read_at IS NULL)
        ORDER BY ts DESC
        LIMIT 100`,
      [teamId, userId, unreadOnly],
    );
    return notificationResource.transformCollection(r.rows);
  }

  async unreadCount(teamId: string, userId: string): Promise<number> {
    const client = await this.getClient();
    const r = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM notifications
        WHERE team_id = $1 AND channel = 'in-app' AND user_id = $2 AND read_at IS NULL`,
      [teamId, userId],
    );
    return Number(r.rows[0].count);
  }

  async markRead(teamId: string, userId: string, id: string): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE notifications
          SET read_at = now(), status = 'read'
        WHERE team_id = $1 AND user_id = $2 AND id = $3 AND read_at IS NULL`,
      [teamId, userId, id],
    );
  }

  async markAllRead(teamId: string, userId: string): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE notifications
          SET read_at = now(), status = 'read'
        WHERE team_id = $1 AND user_id = $2 AND read_at IS NULL AND channel = 'in-app'`,
      [teamId, userId],
    );
  }
}
