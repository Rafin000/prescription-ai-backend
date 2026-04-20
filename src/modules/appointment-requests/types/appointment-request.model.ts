export interface AppointmentRequestRow {
  id: string;
  doctor_id: string;
  chamber_id: string | null;
  phone: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'declined'
    | 'cancelled'
    | 'expired';
  client_nonce: string | null;
  created_at: Date;
  updated_at: Date;
  data: AppointmentRequestData;
}

export interface AppointmentRequestData {
  patient_name: string;
  symptoms?: string;
  preferred_time?: string;
  mode?: 'in-person' | 'video';
  source?: string;
  notes?: string;
}

export interface AppointmentRequestResource {
  id: string;
  doctorId: string;
  chamberId: string | null;
  phone: string;
  status: AppointmentRequestRow['status'];
  patientName: string;
  symptoms: string | null;
  preferredTime: string | null;
  mode: 'in-person' | 'video' | null;
  source: string | null;
  createdAt: string;
}
