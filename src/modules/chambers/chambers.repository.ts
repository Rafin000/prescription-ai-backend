import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { ChamberRow } from './types/chamber.model';

export interface UpsertChamberInput {
  id?: string;
  name: string;
  address: string;
  phone?: string;
  timeLabel?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class ChambersRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async listForDoctor(teamId: string, doctorId: string): Promise<ChamberRow[]> {
    const client = await this.getClient();
    const r = await client.query<ChamberRow>(
      `SELECT * FROM chambers
        WHERE team_id = $1 AND doctor_id = $2
        ORDER BY created_at`,
      [teamId, doctorId],
    );
    return r.rows;
  }

  /**
   * Wholesale replace — the onboarding chambers step submits the full list,
   * we upsert by id, insert new ones, archive the rest.
   */
  async replaceForDoctor(
    teamId: string,
    doctorId: string,
    list: UpsertChamberInput[],
  ): Promise<ChamberRow[]> {
    const client = await this.getClient();
    const keep: string[] = [];

    for (const c of list) {
      const data = JSON.stringify({
        name: c.name,
        address: c.address,
        phone: c.phone ?? null,
        time_label: c.timeLabel ?? null,
        city: c.city ?? null,
      });

      if (c.id) {
        const r = await client.query<{ id: string }>(
          `UPDATE chambers SET
             lat = $3, lng = $4, area = $5, status = 'active',
             data = data || $6::jsonb, updated_at = now()
           WHERE id = $1 AND team_id = $2
           RETURNING id`,
          [c.id, teamId, c.lat ?? null, c.lng ?? null, c.area ?? null, data],
        );
        if (r.rows[0]) keep.push(r.rows[0].id);
      } else {
        const r = await client.query<{ id: string }>(
          `INSERT INTO chambers (team_id, doctor_id, lat, lng, area, status, data)
           VALUES ($1, $2, $3, $4, $5, 'active', $6::jsonb)
           RETURNING id`,
          [teamId, doctorId, c.lat ?? null, c.lng ?? null, c.area ?? null, data],
        );
        keep.push(r.rows[0].id);
      }
    }

    // Archive anything no longer in the list (don't hard-delete — FK from appointments).
    if (keep.length) {
      await client.query(
        `UPDATE chambers SET status = 'archived', updated_at = now()
          WHERE team_id = $1 AND doctor_id = $2 AND id <> ALL($3::uuid[])`,
        [teamId, doctorId, keep],
      );
    } else {
      await client.query(
        `UPDATE chambers SET status = 'archived', updated_at = now()
          WHERE team_id = $1 AND doctor_id = $2`,
        [teamId, doctorId],
      );
    }

    return this.listForDoctor(teamId, doctorId);
  }
}
