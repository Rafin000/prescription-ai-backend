export interface GuestLookupRow {
  appointment_id: string;
  start_at: Date;
  end_at: Date;
  type: 'tele' | 'in-person' | 'surgery' | 'follow-up';
  status: string;
  data: {
    presence?: { doctor?: boolean; patient?: boolean };
    meeting_started_at?: string;
    meeting_ended_at?: string;
    patient_name_cache?: string;
  };
  doctor_name: string | null;
  doctor_name_bn: string | null;
  doctor_specialty: string | null;
  doctor_avatar_url: string | null;
  chamber_name: string | null;
  patient_name: string | null;
}

/** Minimal shape served to the guest patient — no internal IDs leaked. */
export interface GuestAppointmentResource {
  appointmentId: string;
  start: string;
  end: string;
  status: string;
  doctor: {
    name: string;
    nameBn?: string;
    specialty: string;
    avatarUrl?: string;
  };
  chamber: {
    name: string;
  };
  patientName: string;
  doctorPresent: boolean;
  patientPresent: boolean;
  meetingStartedAt?: string;
  meetingEndedAt?: string;
}
