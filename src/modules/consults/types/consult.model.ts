export type ConsultType = 'consultation' | 'follow-up' | 'tele';
export type ConsultStatus = 'ongoing' | 'completed' | 'discarded';
export type RxStatus = 'none' | 'draft' | 'final';

export interface ConsultRow {
  id: string;
  team_id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string | null;
  chamber_id: string | null;
  type: ConsultType;
  status: ConsultStatus;
  rx_status: RxStatus;
  printed: boolean;
  duration_sec: number;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
  data: {
    chief_complaint_cache?: string;
    patient_name_cache?: string;
    diagnoses_cache?: string[];
  };
}

export interface VisitResource {
  id: string;
  patientId: string;
  patientName?: string;
  date: string;
  type: ConsultType;
  duration?: string;
  chiefComplaint: string;
  diagnoses: string[];
  prescriptionId?: string;
  rxStatus: 'final' | 'draft' | 'none';
  printed?: boolean;
}
