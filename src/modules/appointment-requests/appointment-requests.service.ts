import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentRequestsRepository } from './appointment-requests.repository';
import { CreateAppointmentRequestDto } from './dtos/create-appointment-request.dto';
import { ConfirmRequestDto, DeclineRequestDto } from './dtos/confirm-request.dto';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { AppointmentsRepository } from 'src/modules/appointments/appointments.repository';

@Injectable()
export class AppointmentRequestsService {
  constructor(
    private readonly repo: AppointmentRequestsRepository,
    private readonly doctors: DoctorsRepository,
    private readonly appts: AppointmentsRepository,
  ) {}

  create(dto: CreateAppointmentRequestDto) {
    return this.repo.create(dto);
  }

  async listForDoctor(teamId: string, userId: string, status?: string) {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    return this.repo.listForDoctor(doctor.id, status);
  }

  /**
   * Confirm: create a real Appointment (with patient_draft from the request),
   * mark the request confirmed, and return both.
   *
   * SMS notification is enqueued later (slice 9 — notifications). For now
   * we just return the appointment.
   */
  async confirm(
    teamId: string,
    userId: string,
    requestId: string,
    dto: ConfirmRequestDto,
  ) {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    const req = await this.repo.findById(requestId);
    if (!req) throw new NotFoundException('Request not found');
    if (req.doctor_id !== doctor.id) {
      throw new NotFoundException('Request not found');
    }
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    if (end <= start) throw new BadRequestException('end must be after start');

    const appt = await this.appts.create({
      teamId,
      doctorId: doctor.id,
      chamberId: dto.chamberId,
      patientName: req.data?.patient_name ?? 'Unknown',
      start,
      end,
      type: dto.type ?? (req.data?.mode === 'video' ? 'tele' : 'in-person'),
      status: 'confirmed',
      data: {
        note: dto.note ?? null,
        reason: req.data?.symptoms ?? null,
        patient_draft: {
          name: req.data?.patient_name ?? '',
          phone: req.phone,
          age: 0,
          sex: 'other',
        },
        source: req.data?.source ?? null,
        request_id: req.id,
      },
    });

    const updated = await this.repo.setStatus(requestId, 'confirmed', {
      appointment_id: appt.id,
      confirmed_at: new Date().toISOString(),
    });

    return { request: updated, appointment: appt };
  }

  async decline(
    teamId: string,
    userId: string,
    requestId: string,
    dto: DeclineRequestDto,
  ) {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    const req = await this.repo.findById(requestId);
    if (!req || req.doctor_id !== doctor.id) {
      throw new NotFoundException('Request not found');
    }
    return this.repo.setStatus(requestId, 'declined', {
      decline_reason: dto.reason ?? null,
      declined_at: new Date().toISOString(),
    });
  }
}
