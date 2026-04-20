import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { AppointmentsRepository } from 'src/modules/appointments/appointments.repository';
import {
  GuestAppointmentResource,
  GuestLookupRow,
} from './types/guest.model';

@Injectable()
export class VideoService extends BaseRepository {
  private readonly GUEST_SQL: string;

  constructor(
    cls: ClsService,
    db: DatabaseService,
    private readonly appts: AppointmentsRepository,
  ) {
    super(cls, db);
    this.GUEST_SQL = readFileSync(
      join(__dirname, 'queries/guest-lookup.sql'),
      'utf-8',
    );
  }

  async guestLookup(token: string): Promise<GuestAppointmentResource> {
    const client = await this.getClient();
    const r = await client.query<GuestLookupRow>(this.GUEST_SQL, [token]);
    if (!r.rows.length) throw new NotFoundException('Invalid or expired link');
    const row = r.rows[0];
    return toGuestResource(row);
  }

  async announce(token: string, displayName: string): Promise<{ ok: true }> {
    const appt = await this.appts.findByJoinToken(token);
    if (!appt) throw new NotFoundException('Invalid or expired link');
    const nextPresence = { ...(appt.data?.presence ?? {}), patient: true };
    const nowIso = new Date().toISOString();
    const merge: Record<string, unknown> = {
      presence: nextPresence,
      patient_display_name: displayName,
    };
    if (!appt.data?.meeting_started_at) {
      merge.meeting_started_at = nowIso;
    }
    await this.appts.update(appt.team_id, appt.id, { dataMerge: merge });
    return { ok: true };
  }

  async depart(token: string): Promise<{ ok: true }> {
    const appt = await this.appts.findByJoinToken(token);
    if (!appt) throw new NotFoundException('Invalid or expired link');
    const nextPresence = { ...(appt.data?.presence ?? {}), patient: false };
    const nowIso = new Date().toISOString();
    const somebodyLeft = !nextPresence.doctor && !nextPresence.patient;
    const merge: Record<string, unknown> = { presence: nextPresence };
    if (somebodyLeft && !appt.data?.meeting_ended_at) {
      merge.meeting_ended_at = nowIso;
    }
    await this.appts.update(appt.team_id, appt.id, { dataMerge: merge });
    return { ok: true };
  }
}

function toGuestResource(row: GuestLookupRow): GuestAppointmentResource {
  const presence = row.data?.presence ?? {};
  return {
    appointmentId: row.appointment_id,
    start: row.start_at.toISOString(),
    end: row.end_at.toISOString(),
    status: row.status,
    doctor: {
      name: row.doctor_name ?? 'Doctor',
      nameBn: row.doctor_name_bn ?? undefined,
      specialty: row.doctor_specialty ?? '',
      avatarUrl: row.doctor_avatar_url ?? undefined,
    },
    chamber: {
      name: row.chamber_name ?? 'Tele-consult',
    },
    patientName: row.patient_name ?? row.data?.patient_name_cache ?? 'Patient',
    doctorPresent: !!presence.doctor,
    patientPresent: !!presence.patient,
    meetingStartedAt: row.data?.meeting_started_at,
    meetingEndedAt: row.data?.meeting_ended_at,
  };
}
