import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  PrescriptionData,
  PrescriptionResource,
  PrescriptionRow,
} from './types/prescription.model';
import { prescriptionResource } from './transformers/prescription.resource';

@Injectable()
export class PrescriptionsRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async create(input: {
    teamId: string;
    doctorId: string;
    patientId: string;
    consultId?: string;
    status: 'draft' | 'final';
    data: PrescriptionData;
    finaliseNow?: boolean;
    printedNow?: boolean;
  }): Promise<PrescriptionResource> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `INSERT INTO prescriptions
         (team_id, doctor_id, patient_id, consult_id, status,
          finalised_at, printed_at, data)
       VALUES ($1, $2, $3, $4, $5,
         CASE WHEN $6 THEN now() ELSE NULL END,
         CASE WHEN $7 THEN now() ELSE NULL END,
         $8::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.doctorId,
        input.patientId,
        input.consultId ?? null,
        input.status,
        input.status === 'final' || !!input.finaliseNow,
        !!input.printedNow,
        JSON.stringify(input.data),
      ],
    );
    return prescriptionResource.transform(r.rows[0]);
  }

  async getById(teamId: string, id: string): Promise<PrescriptionResource> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `SELECT * FROM prescriptions WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    if (!r.rows.length) throw new NotFoundException('Prescription not found');
    return prescriptionResource.transform(r.rows[0]);
  }

  async findByConsult(teamId: string, consultId: string): Promise<PrescriptionRow | null> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `SELECT * FROM prescriptions
        WHERE team_id = $1 AND consult_id = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [teamId, consultId],
    );
    return r.rows[0] ?? null;
  }

  async updateDraft(
    teamId: string,
    id: string,
    data: PrescriptionData,
  ): Promise<PrescriptionResource> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `UPDATE prescriptions
          SET data = $3::jsonb,
              updated_at = now()
        WHERE team_id = $1 AND id = $2 AND status = 'draft'
        RETURNING *`,
      [teamId, id, JSON.stringify(data)],
    );
    if (!r.rows.length) throw new NotFoundException('Draft prescription not found');
    return prescriptionResource.transform(r.rows[0]);
  }

  async finalise(
    teamId: string,
    id: string,
    data: PrescriptionData,
    printed: boolean,
  ): Promise<PrescriptionResource> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `UPDATE prescriptions
          SET data         = $3::jsonb,
              status       = 'final',
              finalised_at = COALESCE(finalised_at, now()),
              printed_at   = CASE WHEN $4 THEN COALESCE(printed_at, now()) ELSE printed_at END,
              updated_at   = now()
        WHERE team_id = $1 AND id = $2
        RETURNING *`,
      [teamId, id, JSON.stringify(data), printed],
    );
    if (!r.rows.length) throw new NotFoundException('Prescription not found');
    return prescriptionResource.transform(r.rows[0]);
  }

  async listForPatient(
    teamId: string,
    patientId: string,
  ): Promise<PrescriptionResource[]> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `SELECT * FROM prescriptions
        WHERE team_id = $1 AND patient_id = $2
        ORDER BY created_at DESC`,
      [teamId, patientId],
    );
    return prescriptionResource.transformCollection(r.rows);
  }

  async latestFinalForPatient(
    teamId: string,
    patientId: string,
  ): Promise<PrescriptionRow | null> {
    const client = await this.getClient();
    const r = await client.query<PrescriptionRow>(
      `SELECT * FROM prescriptions
        WHERE team_id = $1 AND patient_id = $2 AND status = 'final'
        ORDER BY finalised_at DESC NULLS LAST, created_at DESC
        LIMIT 1`,
      [teamId, patientId],
    );
    return r.rows[0] ?? null;
  }
}
