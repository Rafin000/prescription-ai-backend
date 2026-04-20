import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { CreateAppointmentRequestDto } from './dtos/create-appointment-request.dto';
import { appointmentRequestResource } from './transformers/appointment-request.resource';
import {
  AppointmentRequestResource,
  AppointmentRequestRow,
} from './types/appointment-request.model';

@Injectable()
export class AppointmentRequestsRepository extends BaseRepository {
  private readonly UPSERT_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.UPSERT_SQL = readFileSync(
      join(__dirname, 'queries/upsert-appointment-request.sql'),
      'utf-8',
    );
  }

  async create(dto: CreateAppointmentRequestDto) {
    const client = await this.getClient();
    const data = {
      patient_name: dto.patientName,
      symptoms: dto.symptoms ?? null,
      preferred_time: dto.preferredTime ?? null,
      mode: dto.mode ?? null,
      source: dto.source ?? null,
    };
    const result = await client.query<AppointmentRequestRow>(this.UPSERT_SQL, [
      dto.doctorId,
      dto.chamberId ?? null,
      dto.phone,
      dto.clientNonce ?? null,
      JSON.stringify(data),
    ]);
    if (!result.rows.length) {
      throw new BadRequestException('Could not record appointment request');
    }
    return appointmentRequestResource.transform(result.rows[0]);
  }

  async listForDoctor(
    doctorId: string,
    status?: string,
  ): Promise<AppointmentRequestResource[]> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRequestRow>(
      `SELECT * FROM appointment_requests
        WHERE doctor_id = $1
          AND ($2::text IS NULL OR status = $2::text)
        ORDER BY created_at DESC
        LIMIT 200`,
      [doctorId, status ?? null],
    );
    return appointmentRequestResource.transformCollection(r.rows);
  }

  async findById(id: string): Promise<AppointmentRequestRow | null> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRequestRow>(
      `SELECT * FROM appointment_requests WHERE id = $1 LIMIT 1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async setStatus(
    id: string,
    status: AppointmentRequestRow['status'],
    merge?: Record<string, unknown>,
  ): Promise<AppointmentRequestResource> {
    const client = await this.getClient();
    const r = await client.query<AppointmentRequestRow>(
      `UPDATE appointment_requests SET
         status = $2,
         data = CASE WHEN $3::jsonb IS NULL THEN data ELSE data || $3::jsonb END,
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, status, merge ? JSON.stringify(merge) : null],
    );
    if (!r.rows.length) throw new NotFoundException('Request not found');
    return appointmentRequestResource.transform(r.rows[0]);
  }
}
