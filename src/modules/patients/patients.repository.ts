import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  PatientResource,
  PatientRow,
  PatientWithPiiRow,
} from './types/patient.model';
import { patientResource } from './transformers/patient.resource';
import { CreatePatientDto, UpdatePatientDto } from './dtos/create-patient.dto';

@Injectable()
export class PatientsRepository extends BaseRepository {
  private readonly LIST_SQL: string;
  private readonly GET_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_SQL = readFileSync(join(__dirname, 'queries/list-patients.sql'), 'utf-8');
    this.GET_SQL = readFileSync(join(__dirname, 'queries/get-patient.sql'), 'utf-8');
  }

  async list(
    teamId: string,
    doctorId: string,
    q: string | undefined,
    limit = 100,
    offset = 0,
  ): Promise<PatientResource[]> {
    const client = await this.getClient();
    const r = await client.query<PatientWithPiiRow>(this.LIST_SQL, [
      teamId,
      doctorId,
      q?.trim() ? q.trim() : null,
      limit,
      offset,
    ]);
    return patientResource.transformCollection(r.rows);
  }

  async getById(teamId: string, id: string): Promise<PatientResource> {
    const client = await this.getClient();
    const r = await client.query<PatientWithPiiRow>(this.GET_SQL, [teamId, id]);
    if (!r.rows.length) throw new NotFoundException('Patient not found');
    return patientResource.transform(r.rows[0]);
  }

  async findRowById(teamId: string, id: string): Promise<PatientRow | null> {
    const client = await this.getClient();
    const r = await client.query<PatientRow>(
      `SELECT * FROM patients WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }

  async create(
    teamId: string,
    doctorId: string,
    dto: CreatePatientDto,
  ): Promise<PatientResource> {
    const client = await this.getClient();
    const code = await this.nextCode(teamId);
    const patientInsert = await client.query<PatientRow>(
      `INSERT INTO patients (team_id, doctor_id, code, data)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [
        teamId,
        doctorId,
        code,
        JSON.stringify({
          age: dto.age,
          sex: dto.sex,
          blood_group: dto.bloodGroup ?? null,
          visits_count: 0,
        }),
      ],
    );
    const patient = patientInsert.rows[0];
    await client.query(
      `INSERT INTO patient_pii (patient_id, team_id, data)
       VALUES ($1, $2, $3::jsonb)`,
      [
        patient.id,
        teamId,
        JSON.stringify({
          name: dto.name,
          name_bn: dto.nameBn ?? null,
          phones: [dto.phone],
          addresses: dto.address ? [dto.address] : [],
        }),
      ],
    );
    return this.getById(teamId, patient.id);
  }

  async update(
    teamId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientResource> {
    const client = await this.getClient();

    // Split patch: PII goes to patient_pii, clinical bits to patients.data.
    const piiPatch: Record<string, unknown> = {};
    if (dto.name !== undefined) piiPatch.name = dto.name;
    if (dto.nameBn !== undefined) piiPatch.name_bn = dto.nameBn;
    if (dto.phone !== undefined) piiPatch.phones = [dto.phone];
    if (dto.address !== undefined) piiPatch.addresses = [dto.address];

    const dataPatch: Record<string, unknown> = {};
    if (dto.age !== undefined) dataPatch.age = dto.age;
    if (dto.sex !== undefined) dataPatch.sex = dto.sex;
    if (dto.bloodGroup !== undefined) dataPatch.blood_group = dto.bloodGroup;
    if (dto.allergies !== undefined) dataPatch.allergies = dto.allergies;
    if (dto.emergencyContact !== undefined) {
      dataPatch.emergency_contact = dto.emergencyContact;
    }

    if (Object.keys(piiPatch).length) {
      await client.query(
        `UPDATE patient_pii
           SET data = data || $3::jsonb, updated_at = now()
         WHERE patient_id = $1 AND team_id = $2`,
        [id, teamId, JSON.stringify(piiPatch)],
      );
    }

    if (Object.keys(dataPatch).length) {
      await client.query(
        `UPDATE patients
           SET data = data || $3::jsonb, updated_at = now()
         WHERE id = $1 AND team_id = $2`,
        [id, teamId, JSON.stringify(dataPatch)],
      );
    }

    return this.getById(teamId, id);
  }

  async bumpVisits(teamId: string, id: string): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `UPDATE patients
         SET data = jsonb_set(
                      data,
                      '{visits_count}',
                      to_jsonb(COALESCE((data->>'visits_count')::int, 0) + 1)
                    ),
             updated_at = now()
       WHERE id = $1 AND team_id = $2`,
      [id, teamId],
    );
  }

  private async nextCode(teamId: string): Promise<string> {
    const client = await this.getClient();
    const r = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM patients WHERE team_id = $1`,
      [teamId],
    );
    const n = Number(r.rows[0].count) + 1;
    return `PAT-${n.toString().padStart(5, '0')}`;
  }
}
