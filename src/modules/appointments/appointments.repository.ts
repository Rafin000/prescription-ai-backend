import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  AppointmentResource,
  AppointmentRow,
  AppointmentStatus,
  AppointmentType,
} from './types/appointment.model';
import { appointmentResource } from './transformers/appointment.resource';

@Injectable()
export class AppointmentsRepository extends BaseRepository {
  private readonly LIST_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_SQL = readFileSync(
      join(__dirname, 'queries/list-appointments.sql'),
      'utf-8',
    );
  }

  async list(
    teamId: string,
    doctorId: string,
    from?: Date,
    to?: Date,
  ): Promise<AppointmentResource[]> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRow & { patient_name: string | null }>(
      this.LIST_SQL,
      [teamId, doctorId, from ?? null, to ?? null],
    );
    return appointmentResource.transformCollection(r.rows);
  }

  async getById(teamId: string, id: string): Promise<AppointmentRow | null> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRow>(
      `SELECT * FROM appointments WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }

  /** Public guest lookup — token is the capability, no team scope. */
  async findByJoinToken(token: string): Promise<AppointmentRow | null> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRow>(
      `SELECT * FROM appointments
        WHERE type = 'tele' AND data->>'join_token' = $1
        LIMIT 1`,
      [token],
    );
    return r.rows[0] ?? null;
  }

  async getByIdOrThrow(teamId: string, id: string): Promise<AppointmentResource> {
    const row = await this.getById(teamId, id);
    if (!row) throw new NotFoundException('Appointment not found');
    return this.hydrate(teamId, row);
  }

  async create(input: {
    teamId: string;
    doctorId: string;
    chamberId: string;
    patientId?: string;
    patientName: string;
    start: Date;
    end: Date;
    type: AppointmentType;
    status?: AppointmentStatus;
    data: Record<string, unknown>;
  }): Promise<AppointmentResource> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRow>(
      `INSERT INTO appointments
         (team_id, doctor_id, chamber_id, patient_id, start_at, end_at, type, status, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.doctorId,
        input.chamberId,
        input.patientId ?? null,
        input.start.toISOString(),
        input.end.toISOString(),
        input.type,
        input.status ?? 'pending',
        JSON.stringify({
          ...input.data,
          patient_name_cache: input.patientName,
        }),
      ],
    );
    return this.hydrate(input.teamId, r.rows[0]);
  }

  async update(
    teamId: string,
    id: string,
    patch: {
      start?: Date;
      end?: Date;
      type?: AppointmentType;
      status?: AppointmentStatus;
      chamberId?: string;
      patientId?: string;
      dataMerge?: Record<string, unknown>;
    },
  ): Promise<AppointmentResource> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRow>(
      `UPDATE appointments SET
         start_at    = COALESCE($3, start_at),
         end_at      = COALESCE($4, end_at),
         type        = COALESCE($5, type),
         status      = COALESCE($6, status),
         chamber_id  = COALESCE($7, chamber_id),
         patient_id  = COALESCE($8, patient_id),
         data        = CASE WHEN $9::jsonb IS NULL THEN data ELSE data || $9::jsonb END,
         updated_at  = now()
       WHERE id = $1 AND team_id = $2
       RETURNING *`,
      [
        id,
        teamId,
        patch.start?.toISOString() ?? null,
        patch.end?.toISOString() ?? null,
        patch.type ?? null,
        patch.status ?? null,
        patch.chamberId ?? null,
        patch.patientId ?? null,
        patch.dataMerge ? JSON.stringify(patch.dataMerge) : null,
      ],
    );
    if (!r.rows.length) throw new NotFoundException('Appointment not found');
    return this.hydrate(teamId, r.rows[0]);
  }

  private async hydrate(
    teamId: string,
    row: AppointmentRow,
  ): Promise<AppointmentResource> {
    const client = await this.getClient();
    const r = await client.query<{ name: string | null }>(
      `SELECT pii.data->>'name' AS name
         FROM patient_pii pii
        WHERE pii.team_id = $1 AND pii.patient_id = $2
        LIMIT 1`,
      [teamId, row.patient_id ?? '00000000-0000-0000-0000-000000000000'],
    );
    return appointmentResource.transform({
      ...row,
      patient_name: r.rows[0]?.name ?? null,
    });
  }
}
