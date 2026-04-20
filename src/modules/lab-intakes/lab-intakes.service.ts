import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LabIntakesRepository } from './lab-intakes.repository';
import { PatientsRepository } from 'src/modules/patients/patients.repository';
import {
  AssignLabIntakeDto,
  UploadLabIntakeDto,
} from './dtos/lab-intake.dto';

@Injectable()
export class LabIntakesService {
  constructor(
    private readonly repo: LabIntakesRepository,
    private readonly patients: PatientsRepository,
  ) {}

  list(teamId: string, status?: string) {
    return this.repo.list(teamId, status);
  }

  /**
   * Upload: persist the metadata. In a real setup the bytes would go to S3
   * via a presigned PUT; we only store the metadata here. AI extraction is
   * stubbed — we flag as `needs_review` so the doctor routes manually, or
   * `routed` if the caller provided a patientId hint.
   */
  async upload(teamId: string, userId: string, dto: UploadLabIntakeDto) {
    const hintedPatientId = dto.hints?.patientId ?? null;
    const patient = hintedPatientId
      ? await this.patients.findRowById(teamId, hintedPatientId)
      : null;

    const routed = patient
      ? {
          at: new Date().toISOString(),
          patient_id: patient.id,
          patient_name: 'Patient',
          test_id: dto.hints?.testId,
        }
      : undefined;

    return this.repo.create({
      teamId,
      uploadedBy: userId,
      patientId: patient?.id ?? null,
      status: patient ? 'routed' : 'needs_review',
      data: {
        filename: dto.filename,
        mime: dto.mime,
        size_kb: dto.sizeKb,
        hints: dto.hints
          ? {
              patient_id: dto.hints.patientId,
              test_id: dto.hints.testId,
              note: dto.hints.note,
            }
          : undefined,
        routed,
      },
    });
  }

  async confirm(teamId: string, id: string) {
    const row = await this.repo.findById(teamId, id);
    if (!row) throw new NotFoundException('Lab intake not found');
    const sug = row.data?.suggestion;
    if (!sug) throw new BadRequestException('No AI suggestion to confirm');
    return this.repo.updateStatus(teamId, id, 'routed', {
      routed: {
        patient_id: sug.patient_id,
        patient_name: sug.patient_name,
        test_id: sug.test_id,
        test_name: sug.test_name,
        at: new Date().toISOString(),
      },
    }, sug.patient_id);
  }

  async assign(teamId: string, id: string, dto: AssignLabIntakeDto) {
    const patient = await this.patients.findRowById(teamId, dto.patientId);
    if (!patient) throw new NotFoundException('Patient not found');
    return this.repo.updateStatus(
      teamId,
      id,
      'routed',
      {
        routed: {
          patient_id: patient.id,
          patient_name: 'Patient',
          test_id: dto.testId,
          at: new Date().toISOString(),
        },
      },
      patient.id,
    );
  }

  async archive(teamId: string, id: string) {
    await this.repo.archive(teamId, id);
  }
}
