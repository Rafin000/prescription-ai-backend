import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { FilterDoctorsDto } from './dtos/filter-doctors.dto';
import { doctorListResource } from './transformers/doctor.resource';
import {
  DoctorListRow,
  DoctorResource,
  DoctorRow,
  OnboardingStep,
} from './types/doctor.model';
import { buildMeta, PaginationMeta } from 'src/shared/utils/pagination';

@Injectable()
export class DoctorsRepository extends BaseRepository {
  private readonly LIST_SQL: string;
  private readonly GET_SQL: string;
  private readonly GET_ANY_STATUS_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_SQL = readFileSync(
      join(__dirname, 'queries/list-doctors.sql'),
      'utf-8',
    );
    this.GET_SQL = readFileSync(
      join(__dirname, 'queries/get-doctor.sql'),
      'utf-8',
    );
    this.GET_ANY_STATUS_SQL = readFileSync(
      join(__dirname, 'queries/get-doctor-any-status.sql'),
      'utf-8',
    );
  }

  async list(filter: FilterDoctorsDto): Promise<{
    data: DoctorResource[];
    meta: PaginationMeta;
  }> {
    const client = await this.getClient();
    const result = await client.query<DoctorListRow>(this.LIST_SQL, [
      nullable(filter.q),
      nullable(filter.specialty),
      nullable(filter.area),
      filter.nearLat ?? null,
      filter.nearLng ?? null,
      !!filter.tele,
      filter.limit,
      filter.offset,
    ]);

    const total = Number(result.rows[0]?.total_count ?? 0);
    return {
      data: doctorListResource.transformCollection(result.rows),
      meta: buildMeta(total, filter.limit, filter.offset),
    };
  }

  async getById(id: string): Promise<DoctorResource> {
    const client = await this.getClient();
    const result = await client.query<DoctorListRow>(this.GET_SQL, [id]);
    if (!result.rows.length) throw new NotFoundException('Doctor not found');
    return doctorListResource.transform(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<DoctorRow | null> {
    const client = await this.getClient();
    const r = await client.query<DoctorRow>(
      `SELECT * FROM doctors WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return r.rows[0] ?? null;
  }

  async findRowById(teamId: string, id: string): Promise<DoctorRow | null> {
    const client = await this.getClient();
    const r = await client.query<DoctorRow>(
      `SELECT * FROM doctors WHERE id = $1 AND team_id = $2 LIMIT 1`,
      [id, teamId],
    );
    return r.rows[0] ?? null;
  }

  async createForSignup(input: {
    teamId: string;
    userId: string;
    name: string;
    specialty: string;
    bmdcNo?: string;
    phone?: string;
    email?: string;
  }): Promise<DoctorRow> {
    const client = await this.getClient();
    const r = await client.query<DoctorRow>(
      `INSERT INTO doctors
         (team_id, user_id, name, specialty, bmdc_no, phone, email, status,
          onboarding_step, onboarding_complete, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'paused', 'profile', false, '{}'::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.userId,
        input.name,
        input.specialty,
        input.bmdcNo ?? null,
        input.phone ?? null,
        input.email ?? null,
      ],
    );
    return r.rows[0];
  }

  async updateProfile(
    teamId: string,
    doctorId: string,
    patch: {
      name?: string;
      specialty?: string;
      bmdcNo?: string;
      phone?: string;
      email?: string;
      dataMerge?: Record<string, unknown>;
    },
  ): Promise<DoctorRow> {
    const client = await this.getClient();
    const r = await client.query<DoctorRow>(
      `UPDATE doctors SET
         name       = COALESCE($3, name),
         specialty  = COALESCE($4, specialty),
         bmdc_no    = COALESCE($5, bmdc_no),
         phone      = COALESCE($6, phone),
         email      = COALESCE($7, email),
         data       = CASE WHEN $8::jsonb IS NULL THEN data ELSE data || $8::jsonb END,
         updated_at = now()
       WHERE id = $1 AND team_id = $2
       RETURNING *`,
      [
        doctorId,
        teamId,
        patch.name ?? null,
        patch.specialty ?? null,
        patch.bmdcNo ?? null,
        patch.phone ?? null,
        patch.email ?? null,
        patch.dataMerge ? JSON.stringify(patch.dataMerge) : null,
      ],
    );
    if (!r.rows.length) throw new NotFoundException('Doctor not found');
    return r.rows[0];
  }

  async setOnboardingStep(
    teamId: string,
    doctorId: string,
    step: OnboardingStep,
    complete: boolean,
  ): Promise<DoctorRow> {
    const client = await this.getClient();
    const r = await client.query<DoctorRow>(
      `UPDATE doctors SET
         onboarding_step     = $3,
         onboarding_complete = $4,
         status              = CASE WHEN $4 THEN 'active' ELSE status END,
         updated_at          = now()
       WHERE id = $1 AND team_id = $2
       RETURNING *`,
      [doctorId, teamId, step, complete],
    );
    if (!r.rows.length) throw new NotFoundException('Doctor not found');
    return r.rows[0];
  }

  async getRichRowById(teamId: string, doctorId: string): Promise<DoctorListRow> {
    const client = await this.getClient();
    const r = await client.query<DoctorListRow>(this.GET_ANY_STATUS_SQL, [doctorId]);
    if (!r.rows.length) throw new NotFoundException('Doctor not found');
    if ((r.rows[0] as unknown as DoctorRow).team_id !== teamId) {
      throw new NotFoundException('Doctor not found');
    }
    return r.rows[0];
  }
}

function nullable(v: string | undefined | null): string | null {
  const s = (v ?? '').trim();
  return s.length ? s : null;
}
