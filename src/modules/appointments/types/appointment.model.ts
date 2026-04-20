export type AppointmentType = 'in-person' | 'tele' | 'surgery' | 'follow-up';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'noshow'
  | 'done';

export interface AppointmentPatientDraft {
  name: string;
  name_bn?: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  phone: string;
  address?: string;
  blood_group?: string;
}

export interface AppointmentRow {
  id: string;
  team_id: string;
  doctor_id: string;
  chamber_id: string | null;
  patient_id: string | null;
  start_at: Date;
  end_at: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  created_at: Date;
  updated_at: Date;
  data: AppointmentData;
}

export interface AppointmentData {
  note?: string;
  reason?: string;
  procedure?: string;
  hospital?: string;
  patient_draft?: AppointmentPatientDraft;
  patient_name_cache?: string;
  surgical_plan_id?: string;
  join_token?: string;
  presence?: { doctor?: boolean; patient?: boolean };
  meeting_started_at?: string;
  meeting_ended_at?: string;
  duration_min?: number;
}

export interface AppointmentResource {
  id: string;
  patientId: string;
  patientName: string;
  start: string;
  end: string;
  type: AppointmentType;
  status: AppointmentStatus;
  chamberId: string;
  note?: string;
  reason?: string;
  patientDraft?: {
    name: string;
    nameBn?: string;
    age: number;
    sex: 'male' | 'female' | 'other';
    phone: string;
    address?: string;
    bloodGroup?: string;
  };
  joinToken?: string;
  patientJoined?: boolean;
  doctorPresent?: boolean;
  patientPresent?: boolean;
  meetingStartedAt?: string;
  meetingEndedAt?: string;
  surgicalPlanId?: string;
  hospital?: string;
  expectedDurationMin?: number;
  procedure?: string;
}
