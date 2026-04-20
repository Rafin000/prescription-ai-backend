export type LabIntakeStatus =
  | 'processing'
  | 'routed'
  | 'needs_review'
  | 'unidentified'
  | 'archived';

export interface LabIntakeData {
  filename?: string;
  mime?: string;
  size_kb?: number;
  pages?: number;
  preview_url?: string;
  s3_key?: string;
  note?: string;
  hints?: { patient_id?: string; test_id?: string; note?: string };
  extracted?: {
    patient_name?: string;
    patient_id?: string;
    test_name?: string;
    lab_name?: string;
    collection_date?: string;
    summary?: string;
  };
  suggestion?: {
    patient_id: string;
    patient_name: string;
    test_id?: string;
    test_name?: string;
    confidence: number;
    reason?: string;
  };
  routed?: {
    patient_id: string;
    patient_name: string;
    test_id?: string;
    test_name?: string;
    lab_id?: string;
    at: string;
  };
}

export interface LabIntakeRow {
  id: string;
  team_id: string;
  uploaded_by: string | null;
  patient_id: string | null;
  status: LabIntakeStatus;
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
  data: LabIntakeData;
}

export interface LabIntakeResource {
  id: string;
  filename: string;
  mime: string;
  sizeKb: number;
  pages?: number;
  uploadedAt: string;
  uploadedBy: string;
  status: LabIntakeStatus;
  previewUrl?: string;
  extracted?: {
    patientName?: string;
    patientId?: string;
    testName?: string;
    labName?: string;
    collectionDate?: string;
    summary?: string;
  };
  suggestion?: {
    patientId: string;
    patientName: string;
    testId?: string;
    testName?: string;
    confidence: number;
    reason?: string;
  };
  routed?: {
    patientId: string;
    patientName: string;
    testId?: string;
    testName?: string;
    labId?: string;
    at: string;
  };
  note?: string;
}
