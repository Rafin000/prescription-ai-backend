import { makeTransformer } from 'src/base/base.transformer';
import {
  AppointmentResource,
  AppointmentRow,
} from '../types/appointment.model';

type Row = AppointmentRow & { patient_name?: string | null };

export const appointmentResource = makeTransformer<Row, AppointmentResource>(
  (row) => {
    const data = row.data ?? {};
    const draft = data.patient_draft;
    const presence = data.presence ?? {};
    return {
      id: row.id,
      patientId: row.patient_id ?? '',
      patientName:
        row.patient_name ??
        data.patient_name_cache ??
        draft?.name ??
        '',
      start: row.start_at.toISOString(),
      end: row.end_at.toISOString(),
      type: row.type,
      status: row.status,
      chamberId: row.chamber_id ?? '',
      note: data.note,
      reason: data.reason,
      patientDraft: draft
        ? {
            name: draft.name,
            nameBn: draft.name_bn,
            age: draft.age,
            sex: draft.sex,
            phone: draft.phone,
            address: draft.address,
            bloodGroup: draft.blood_group,
          }
        : undefined,
      joinToken: data.join_token,
      patientJoined: presence.patient,
      doctorPresent: presence.doctor,
      patientPresent: presence.patient,
      meetingStartedAt: data.meeting_started_at,
      meetingEndedAt: data.meeting_ended_at,
      surgicalPlanId: data.surgical_plan_id,
      hospital: data.hospital,
      expectedDurationMin: data.duration_min,
      procedure: data.procedure,
    };
  },
);
