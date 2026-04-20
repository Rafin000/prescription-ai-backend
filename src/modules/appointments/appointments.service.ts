import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { PatientsRepository } from 'src/modules/patients/patients.repository';
import { PatientsService } from 'src/modules/patients/patients.service';
import { AppointmentsRepository } from './appointments.repository';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dtos/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appts: AppointmentsRepository,
    private readonly doctors: DoctorsRepository,
    private readonly patients: PatientsRepository,
    private readonly patientsSvc: PatientsService,
  ) {}

  async list(teamId: string, userId: string, from?: string, to?: string) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    return this.appts.list(
      teamId,
      doctorId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  get(teamId: string, id: string) {
    return this.appts.getByIdOrThrow(teamId, id);
  }

  async create(teamId: string, userId: string, dto: CreateAppointmentDto) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    if (end <= start) throw new BadRequestException('end must be after start');

    if (!dto.patientId && !dto.patientDraft) {
      throw new BadRequestException('patientId or patientDraft is required');
    }

    return this.appts.create({
      teamId,
      doctorId,
      chamberId: dto.chamberId,
      patientId: dto.patientId,
      patientName: dto.patientName,
      start,
      end,
      type: dto.type,
      status: 'pending',
      data: {
        note: dto.note ?? null,
        reason: dto.reason ?? null,
        procedure: dto.procedure ?? null,
        hospital: dto.hospital ?? null,
        patient_draft: dto.patientDraft
          ? {
              name: dto.patientDraft.name,
              name_bn: dto.patientDraft.nameBn,
              age: dto.patientDraft.age,
              sex: dto.patientDraft.sex,
              phone: dto.patientDraft.phone,
              address: dto.patientDraft.address,
              blood_group: dto.patientDraft.bloodGroup,
            }
          : null,
        // Mint a one-shot, URL-safe token so the patient can join the tele
        // call via /join/:token without an account.
        join_token: dto.type === 'tele' ? randomBytes(18).toString('base64url') : null,
      },
    });
  }

  update(teamId: string, id: string, dto: UpdateAppointmentDto) {
    return this.appts.update(teamId, id, {
      start: dto.start ? new Date(dto.start) : undefined,
      end: dto.end ? new Date(dto.end) : undefined,
      type: dto.type,
      status: dto.status,
      chamberId: dto.chamberId,
      patientId: dto.patientId,
      dataMerge:
        dto.note || dto.reason || dto.procedure || dto.hospital || dto.patientName
          ? {
              note: dto.note,
              reason: dto.reason,
              procedure: dto.procedure,
              hospital: dto.hospital,
              patient_name_cache: dto.patientName,
            }
          : undefined,
    });
  }

  /** Create a real Patient row from the draft + link it to the appointment. */
  async promoteDraft(teamId: string, userId: string, appointmentId: string) {
    const row = await this.appts.getById(teamId, appointmentId);
    if (!row) throw new NotFoundException('Appointment not found');
    const draft = row.data?.patient_draft;
    if (!draft) throw new BadRequestException('Appointment has no patient draft');
    if (row.patient_id) {
      // Already promoted — return current state.
      const appointment = await this.appts.getByIdOrThrow(teamId, appointmentId);
      const patient = await this.patients.getById(teamId, row.patient_id);
      return { appointment, patient };
    }

    const patient = await this.patientsSvc.create(teamId, userId, {
      name: draft.name,
      nameBn: draft.name_bn,
      age: draft.age,
      sex: draft.sex,
      phone: draft.phone,
      address: draft.address,
      bloodGroup: draft.blood_group,
    });

    const appointment = await this.appts.update(teamId, appointmentId, {
      patientId: patient.id,
      dataMerge: { patient_draft: null, patient_name_cache: patient.name },
    });

    return { appointment, patient };
  }

  async setPresence(
    teamId: string,
    id: string,
    actor: 'doctor' | 'patient',
    present: boolean,
  ) {
    const row = await this.appts.getById(teamId, id);
    if (!row) throw new NotFoundException('Appointment not found');
    const nextPresence = { ...(row.data?.presence ?? {}), [actor]: present };
    const nowIso = new Date().toISOString();
    const merge: Record<string, unknown> = { presence: nextPresence };
    const somebodyPresent = !!nextPresence.doctor || !!nextPresence.patient;

    if (!row.data?.meeting_started_at && somebodyPresent) {
      merge.meeting_started_at = nowIso;
    }
    if (row.data?.meeting_started_at && !somebodyPresent && !row.data?.meeting_ended_at) {
      merge.meeting_ended_at = nowIso;
    }

    return this.appts.update(teamId, id, { dataMerge: merge });
  }

  private async resolveDoctor(teamId: string, userId: string): Promise<string> {
    const d = await this.doctors.findByUserId(userId);
    if (!d || d.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    return d.id;
  }
}
