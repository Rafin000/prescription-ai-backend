export interface RxMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface PrescriptionData {
  chief_complaint?: string;
  diagnoses?: string[];
  tests?: string[];
  advice?: string[];
  medicines?: RxMedicine[];
  follow_up?: string;
  notes?: string;
  operation?: string;
}

export interface PrescriptionRow {
  id: string;
  team_id: string;
  doctor_id: string;
  patient_id: string;
  consult_id: string | null;
  status: 'draft' | 'final' | 'cancelled';
  finalised_at: Date | null;
  printed_at: Date | null;
  model_id: string | null;
  prompt_version: string | null;
  created_at: Date;
  updated_at: Date;
  data: PrescriptionData;
}

export interface PrescriptionResource {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  chiefComplaint?: string;
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxMedicine[];
  followUp?: string;
  notes?: string;
  operation?: string;
  status: 'draft' | 'final';
  printedAt?: string;
  visitId?: string;
}
