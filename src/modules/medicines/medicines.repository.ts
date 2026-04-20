import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { MedicineResource, MedicineRow } from './types/medicine.model';
import { medicineResource } from './transformers/medicine.resource';

@Injectable()
export class MedicinesRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  /** Shared (team_id NULL) + this team's custom adds/overrides. */
  async search(teamId: string, q?: string, limit = 50): Promise<MedicineResource[]> {
    const client = await this.getClient();
    const qs = q?.trim();
    const r = await client.query<MedicineRow>(
      `SELECT * FROM medicines
        WHERE (team_id IS NULL OR team_id = $1)
          AND ($2::text IS NULL
               OR brand ILIKE '%' || $2::text || '%'
               OR generic ILIKE '%' || $2::text || '%')
        ORDER BY
          CASE WHEN team_id = $1 THEN 0 ELSE 1 END,
          rating DESC NULLS LAST,
          brand
        LIMIT $3`,
      [teamId, qs && qs.length ? qs : null, Math.min(limit, 200)],
    );
    return medicineResource.transformCollection(r.rows);
  }

  async updateNote(
    teamId: string,
    id: string,
    patch: { rating?: number; doctorNote?: string },
  ): Promise<MedicineResource> {
    const client = await this.getClient();
    // Notes + ratings live on this team's copy. If the row they patched is
    // the shared baseline (team_id null), fork a team-scoped copy first.
    const current = await client.query<MedicineRow>(
      `SELECT * FROM medicines WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (!current.rows.length) throw new NotFoundException('Medicine not found');
    const row = current.rows[0];

    const dataMerge: Record<string, unknown> = {};
    if (patch.doctorNote !== undefined) dataMerge.doctor_note = patch.doctorNote;

    if (row.team_id === null) {
      const forked = await client.query<MedicineRow>(
        `INSERT INTO medicines
           (team_id, brand, generic, strength, company, form, rating, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,
        [
          teamId,
          row.brand,
          row.generic,
          row.strength,
          row.company,
          row.form,
          patch.rating ?? row.rating,
          JSON.stringify({ ...(row.data ?? {}), ...dataMerge }),
        ],
      );
      return medicineResource.transform(forked.rows[0]);
    }

    const r = await client.query<MedicineRow>(
      `UPDATE medicines SET
          rating = COALESCE($3, rating),
          data   = data || $4::jsonb,
          updated_at = now()
        WHERE id = $1 AND team_id = $2
        RETURNING *`,
      [
        id,
        teamId,
        patch.rating ?? null,
        JSON.stringify(dataMerge),
      ],
    );
    if (!r.rows.length) throw new NotFoundException('Medicine not found');
    return medicineResource.transform(r.rows[0]);
  }
}
