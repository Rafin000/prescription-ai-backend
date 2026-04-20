import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  RxTemplateData,
  RxTemplateResource,
  RxTemplateRow,
} from './types/rx-template.model';
import { rxTemplateResource } from './transformers/rx-template.resource';

@Injectable()
export class RxTemplatesRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  /** Lists the user's own templates + shared (team_id match, doctor_id null). */
  async list(
    teamId: string,
    doctorId: string,
  ): Promise<RxTemplateResource[]> {
    const client = await this.getClient();
    const r = await client.query<RxTemplateRow>(
      `SELECT * FROM rx_templates
        WHERE team_id = $1
          AND (doctor_id = $2 OR doctor_id IS NULL)
        ORDER BY CASE WHEN doctor_id = $2 THEN 0 ELSE 1 END,
                 updated_at DESC`,
      [teamId, doctorId],
    );
    return rxTemplateResource.transformCollection(r.rows);
  }

  async create(input: {
    teamId: string;
    doctorId: string;
    shared: boolean;
    name: string;
    description?: string;
    data: RxTemplateData;
  }): Promise<RxTemplateResource> {
    const client = await this.getClient();
    const r = await client.query<RxTemplateRow>(
      `INSERT INTO rx_templates
         (team_id, doctor_id, name, description, data)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.shared ? null : input.doctorId,
        input.name,
        input.description ?? null,
        JSON.stringify(input.data),
      ],
    );
    return rxTemplateResource.transform(r.rows[0]);
  }

  async update(input: {
    teamId: string;
    doctorId: string;
    id: string;
    name?: string;
    description?: string | null;
    shared?: boolean;
    data?: RxTemplateData;
    isOwner: boolean;
  }): Promise<RxTemplateResource> {
    const client = await this.getClient();
    const row = await this.findRow(input.teamId, input.id);
    if (!row) throw new NotFoundException('Template not found');
    if (row.doctor_id === null && !input.isOwner) {
      throw new ForbiddenException('Only the admin can edit shared templates');
    }
    if (row.doctor_id !== null && row.doctor_id !== input.doctorId) {
      throw new ForbiddenException('You can only edit your own templates');
    }
    const nextDoctorId =
      input.shared === undefined
        ? row.doctor_id
        : input.shared
          ? null
          : input.doctorId;
    const r = await client.query<RxTemplateRow>(
      `UPDATE rx_templates SET
          doctor_id   = $3,
          name        = COALESCE($4, name),
          description = COALESCE($5, description),
          data        = CASE WHEN $6::jsonb IS NULL THEN data ELSE $6::jsonb END,
          updated_at  = now()
        WHERE team_id = $1 AND id = $2
        RETURNING *`,
      [
        input.teamId,
        input.id,
        nextDoctorId,
        input.name ?? null,
        input.description ?? null,
        input.data ? JSON.stringify(input.data) : null,
      ],
    );
    return rxTemplateResource.transform(r.rows[0]);
  }

  async remove(
    teamId: string,
    doctorId: string,
    id: string,
    isOwner: boolean,
  ): Promise<void> {
    const row = await this.findRow(teamId, id);
    if (!row) throw new NotFoundException('Template not found');
    if (row.doctor_id === null && !isOwner) {
      throw new ForbiddenException('Only the admin can delete shared templates');
    }
    if (row.doctor_id !== null && row.doctor_id !== doctorId) {
      throw new ForbiddenException('You can only delete your own templates');
    }
    const client = await this.getClient();
    await client.query(
      `DELETE FROM rx_templates WHERE team_id = $1 AND id = $2`,
      [teamId, id],
    );
  }

  async bumpUsage(teamId: string, id: string): Promise<RxTemplateResource> {
    const client = await this.getClient();
    const r = await client.query<RxTemplateRow>(
      `UPDATE rx_templates SET usage_count = usage_count + 1, updated_at = now()
        WHERE team_id = $1 AND id = $2
        RETURNING *`,
      [teamId, id],
    );
    if (!r.rows.length) throw new NotFoundException('Template not found');
    return rxTemplateResource.transform(r.rows[0]);
  }

  private async findRow(teamId: string, id: string): Promise<RxTemplateRow | null> {
    const client = await this.getClient();
    const r = await client.query<RxTemplateRow>(
      `SELECT * FROM rx_templates WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }
}
