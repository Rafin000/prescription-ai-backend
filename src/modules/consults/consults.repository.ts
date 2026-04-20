import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  ConsultRow,
  ConsultType,
  RxStatus,
  VisitResource,
} from './types/consult.model';
import { visitResource } from './transformers/visit.resource';

@Injectable()
export class ConsultsRepository extends BaseRepository {
  private readonly LIST_SQL: string;
  private readonly LIST_FOR_PATIENT_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.LIST_SQL = readFileSync(join(__dirname, 'queries/list-visits.sql'), 'utf-8');
    this.LIST_FOR_PATIENT_SQL = readFileSync(
      join(__dirname, 'queries/list-visits-for-patient.sql'),
      'utf-8',
    );
  }

  async create(input: {
    teamId: string;
    doctorId: string;
    patientId: string;
    patientName: string;
    type: ConsultType;
    startedAt: Date;
    endedAt: Date;
    durationSec: number;
    rxStatus: RxStatus;
    printed: boolean;
    chiefComplaintCache?: string;
    diagnosesCache?: string[];
  }): Promise<ConsultRow> {
    const client = await this.getClient();
    const r = await client.query<ConsultRow>(
      `INSERT INTO consults
         (team_id, doctor_id, patient_id, type, status,
          rx_status, printed, duration_sec, started_at, ended_at, data)
       VALUES ($1, $2, $3, $4, 'completed',
               $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.doctorId,
        input.patientId,
        input.type,
        input.rxStatus,
        input.printed,
        input.durationSec,
        input.startedAt.toISOString(),
        input.endedAt.toISOString(),
        JSON.stringify({
          patient_name_cache: input.patientName,
          chief_complaint_cache: input.chiefComplaintCache ?? null,
          diagnoses_cache: input.diagnosesCache ?? [],
        }),
      ],
    );
    return r.rows[0];
  }

  async setRxStatus(
    teamId: string,
    id: string,
    rxStatus: RxStatus,
    printed: boolean,
  ): Promise<ConsultRow> {
    const client = await this.getClient();
    const r = await client.query<ConsultRow>(
      `UPDATE consults
          SET rx_status = $3, printed = $4, updated_at = now()
        WHERE team_id = $1 AND id = $2
        RETURNING *`,
      [teamId, id, rxStatus, printed],
    );
    if (!r.rows.length) throw new NotFoundException('Consult not found');
    return r.rows[0];
  }

  async findById(teamId: string, id: string): Promise<ConsultRow | null> {
    const client = await this.getClient();
    const r = await client.query<ConsultRow>(
      `SELECT * FROM consults WHERE team_id = $1 AND id = $2 LIMIT 1`,
      [teamId, id],
    );
    return r.rows[0] ?? null;
  }

  async listAll(teamId: string, doctorId: string): Promise<VisitResource[]> {
    const client = await this.getClient();
    const r = await client.query(this.LIST_SQL, [teamId, doctorId]);
    return visitResource.transformCollection(r.rows as Parameters<typeof visitResource.transform>[0][]);
  }

  async listForPatient(teamId: string, patientId: string): Promise<VisitResource[]> {
    const client = await this.getClient();
    const r = await client.query(this.LIST_FOR_PATIENT_SQL, [teamId, patientId]);
    return visitResource.transformCollection(r.rows as Parameters<typeof visitResource.transform>[0][]);
  }
}
