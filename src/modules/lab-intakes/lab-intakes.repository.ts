import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  LabIntakeData,
  LabIntakeResource,
  LabIntakeRow,
  LabIntakeStatus,
} from './types/lab-intake.model';
import { labIntakeResource } from './transformers/lab-intake.resource';

@Injectable()
export class LabIntakesRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async list(teamId: string, status?: string): Promise<LabIntakeResource[]> {
    const client = await this.getClient();
    const r = await client.query<LabIntakeRow>(
      `SELECT * FROM lab_intakes
        WHERE team_id = $1
          AND ($2::text IS NULL OR status = $2::text)
        ORDER BY uploaded_at DESC
        LIMIT 200`,
      [teamId, status ?? null],
    );
    return labIntakeResource.transformCollection(r.rows);
  }

  async create(input: {
    teamId: string;
    uploadedBy: string | null;
    data: LabIntakeData;
    patientId?: string | null;
    status?: LabIntakeStatus;
  }): Promise<LabIntakeResource> {
    const client = await this.getClient();
    const r = await client.query<LabIntakeRow>(
      `INSERT INTO lab_intakes (team_id, uploaded_by, patient_id, status, data)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.uploadedBy,
        input.patientId ?? null,
        input.status ?? 'processing',
        JSON.stringify(input.data),
      ],
    );
    return labIntakeResource.transform(r.rows[0]);
  }

  async updateStatus(
    teamId: string,
    id: string,
    status: LabIntakeStatus,
    merge?: Partial<LabIntakeData>,
    patientId?: string | null,
  ): Promise<LabIntakeResource> {
    const client = await this.getClient();
    const r = await client.query<LabIntakeRow>(
      `UPDATE lab_intakes SET
          status     = $3,
          patient_id = COALESCE($4, patient_id),
          data       = CASE WHEN $5::jsonb IS NULL THEN data ELSE data || $5::jsonb END,
          updated_at = now()
        WHERE team_id = $1 AND id = $2
        RETURNING *`,
      [
        teamId,
        id,
        status,
        patientId ?? null,
        merge ? JSON.stringify(merge) : null,
      ],
    );
    if (!r.rows.length) throw new NotFoundException('Lab intake not found');
    return labIntakeResource.transform(r.rows[0]);
  }

  async findById(teamId: string, id: string): Promise<LabIntakeRow | null> {
    const client = await this.getClient();
    const r = await client.query<LabIntakeRow>(
      `SELECT * FROM lab_intakes WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }

  async archive(teamId: string, id: string): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE lab_intakes SET status = 'archived', updated_at = now()
        WHERE team_id = $1 AND id = $2`,
      [teamId, id],
    );
  }
}
