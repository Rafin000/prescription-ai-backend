export type Sex = 'male' | 'female' | 'other';

export interface PatientRow {
  id: string;
  team_id: string;
  doctor_id: string;
  code: string;
  status: 'active' | 'archived' | 'merged';
  patient_since: Date;
  anonymised_at: Date | null;
  created_at: Date;
  updated_at: Date;
  data: PatientData;
}

export interface PatientData {
  age?: number;
  sex?: Sex;
  blood_group?: string;
  allergies?: string[];
  conditions?: Array<{
    name: string;
    diagnosed_year: number;
    status?: 'controlled' | 'uncontrolled' | 'suspected';
  }>;
  notes?: string;
  avatar_url?: string;
  surgical_plan?: Record<string, unknown> | null;
  emergency_contact?: {
    name: string;
    relation: string;
    phone: string;
  } | null;
  visits_count?: number;
}

export interface PatientPiiRow {
  patient_id: string;
  team_id: string;
  data: PatientPiiData;
  updated_at: Date;
}

export interface PatientPiiData {
  name: string;
  name_bn?: string;
  phones?: string[];
  addresses?: string[];
}

/** API resource matching the dashboard's `Patient` type. */
export interface PatientResource {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  age: number;
  sex: Sex;
  phone: string;
  address: string;
  bloodGroup?: string;
  allergies?: string[];
  conditions?: Array<{
    name: string;
    diagnosedYear: number;
    status?: 'controlled' | 'uncontrolled' | 'suspected';
  }>;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  patientSince: string;
  visits: number;
  avatarUrl?: string;
  surgicalPlan?: Record<string, unknown> | null;
}

/** Row shape for the joined list query. */
export interface PatientWithPiiRow extends PatientRow {
  pii: PatientPiiData | null;
}
