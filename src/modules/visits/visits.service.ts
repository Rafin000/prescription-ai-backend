import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { PatientsRepository } from 'src/modules/patients/patients.repository';
import { ConsultsRepository } from 'src/modules/consults/consults.repository';
import { PrescriptionsRepository } from 'src/modules/prescriptions/prescriptions.repository';
import { PrescriptionData } from 'src/modules/prescriptions/types/prescription.model';
import { VisitResource } from 'src/modules/consults/types/consult.model';
import { visitResource } from 'src/modules/consults/transformers/visit.resource';
import {
  CreateVisitDto,
  FinalizeDraftDto,
  RxDraftDto,
  UpdateDraftDto,
} from './dtos/create-visit.dto';
import { PrescriptionResource } from 'src/modules/prescriptions/types/prescription.model';

export interface VisitWithRx {
  visit: VisitResource;
  prescription?: PrescriptionResource;
}

@Injectable()
export class VisitsService {
  constructor(
    private readonly doctors: DoctorsRepository,
    private readonly patients: PatientsRepository,
    private readonly consults: ConsultsRepository,
    private readonly prescriptions: PrescriptionsRepository,
  ) {}

  listAll(teamId: string, userId: string) {
    return this.resolveDoctor(teamId, userId).then((doctorId) =>
      this.consults.listAll(teamId, doctorId),
    );
  }

  listForPatient(teamId: string, patientId: string) {
    return this.consults.listForPatient(teamId, patientId);
  }

  async create(
    teamId: string,
    userId: string,
    dto: CreateVisitDto,
  ): Promise<VisitWithRx> {
    const doctorId = await this.resolveDoctor(teamId, userId);
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(startedAt.getTime() + dto.durationSec * 1000);

    if (dto.rxStatus !== 'none' && !dto.draft) {
      throw new BadRequestException('draft is required unless rxStatus is none');
    }

    const consultRow = await this.consults.create({
      teamId,
      doctorId,
      patientId: dto.patientId,
      patientName: dto.patientName,
      type: dto.type,
      startedAt,
      endedAt,
      durationSec: dto.durationSec,
      rxStatus: dto.rxStatus,
      printed: !!dto.printed,
      chiefComplaintCache: dto.draft?.chiefComplaint,
      diagnosesCache: dto.draft?.diagnoses,
    });

    let prescription: PrescriptionResource | undefined;
    if (dto.draft) {
      const data = this.draftToData(dto.draft);
      prescription = await this.prescriptions.create({
        teamId,
        doctorId,
        patientId: dto.patientId,
        consultId: consultRow.id,
        status: dto.rxStatus === 'final' ? 'final' : 'draft',
        data,
        finaliseNow: dto.rxStatus === 'final',
        printedNow: dto.rxStatus === 'final' && !!dto.printed,
      });
    }

    if (dto.rxStatus !== 'none') {
      await this.patients.bumpVisits(teamId, dto.patientId);
    }

    return {
      visit: await this.hydrate(consultRow.id, teamId, userId, dto.patientName),
      prescription,
    };
  }

  async finalise(
    teamId: string,
    userId: string,
    visitId: string,
    dto: FinalizeDraftDto,
  ): Promise<VisitWithRx> {
    const consult = await this.consults.findById(teamId, visitId);
    if (!consult) throw new NotFoundException('Visit not found');

    const draftData = this.draftToData(dto.draft);
    const existing = await this.prescriptions.findByConsult(teamId, visitId);

    let prescription: PrescriptionResource;
    if (existing) {
      prescription = await this.prescriptions.finalise(
        teamId,
        existing.id,
        draftData,
        !!dto.printed,
      );
    } else {
      prescription = await this.prescriptions.create({
        teamId,
        doctorId: consult.doctor_id,
        patientId: consult.patient_id,
        consultId: consult.id,
        status: 'final',
        data: draftData,
        finaliseNow: true,
        printedNow: !!dto.printed,
      });
    }

    await this.consults.setRxStatus(teamId, visitId, 'final', !!dto.printed);

    const patientName = consult.data?.patient_name_cache;
    return {
      visit: await this.hydrate(consult.id, teamId, userId, patientName),
      prescription,
    };
  }

  async updateDraft(
    teamId: string,
    userId: string,
    visitId: string,
    dto: UpdateDraftDto,
  ): Promise<VisitWithRx> {
    const consult = await this.consults.findById(teamId, visitId);
    if (!consult) throw new NotFoundException('Visit not found');

    const draftData = this.draftToData(dto.draft);
    const existing = await this.prescriptions.findByConsult(teamId, visitId);

    let prescription: PrescriptionResource;
    if (existing) {
      prescription = await this.prescriptions.updateDraft(
        teamId,
        existing.id,
        draftData,
      );
    } else {
      prescription = await this.prescriptions.create({
        teamId,
        doctorId: consult.doctor_id,
        patientId: consult.patient_id,
        consultId: consult.id,
        status: 'draft',
        data: draftData,
      });
      await this.consults.setRxStatus(teamId, visitId, 'draft', consult.printed);
    }

    const patientName = consult.data?.patient_name_cache;
    return {
      visit: await this.hydrate(consult.id, teamId, userId, patientName),
      prescription,
    };
  }

  private draftToData(draft: RxDraftDto): PrescriptionData {
    return {
      chief_complaint: draft.chiefComplaint,
      diagnoses: draft.diagnoses,
      tests: draft.tests,
      advice: draft.advice,
      medicines: draft.medicines.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes,
      })),
      follow_up: draft.followUp,
      notes: draft.notes,
      operation: draft.operation,
    };
  }

  private async hydrate(
    visitId: string,
    teamId: string,
    userId: string,
    patientName?: string,
  ): Promise<VisitResource> {
    const doctorId = await this.resolveDoctor(teamId, userId);
    const all = await this.consults.listAll(teamId, doctorId);
    const found = all.find((v) => v.id === visitId);
    if (found) return found;

    const row = await this.consults.findById(teamId, visitId);
    if (!row) throw new NotFoundException('Visit not found');
    const rx = await this.prescriptions.findByConsult(teamId, visitId);
    return visitResource.transform({
      ...row,
      prescription_id: rx?.id ?? null,
      prescription_data: rx?.data
        ? { ...(rx.data as Record<string, unknown>) }
        : null,
      patient_name: patientName ?? null,
    });
  }

  private async resolveDoctor(teamId: string, userId: string): Promise<string> {
    const d = await this.doctors.findByUserId(userId);
    if (!d || d.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    return d.id;
  }
}
