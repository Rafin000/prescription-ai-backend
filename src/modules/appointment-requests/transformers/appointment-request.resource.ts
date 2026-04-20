import { makeTransformer } from 'src/base/base.transformer';
import {
  AppointmentRequestResource,
  AppointmentRequestRow,
} from '../types/appointment-request.model';

export const appointmentRequestResource = makeTransformer<
  AppointmentRequestRow,
  AppointmentRequestResource
>((row) => ({
  id: row.id,
  doctorId: row.doctor_id,
  chamberId: row.chamber_id,
  phone: row.phone,
  status: row.status,
  patientName: row.data?.patient_name ?? '',
  symptoms: row.data?.symptoms ?? null,
  preferredTime: row.data?.preferred_time ?? null,
  mode: row.data?.mode ?? null,
  source: row.data?.source ?? null,
  createdAt: row.created_at.toISOString(),
}));
