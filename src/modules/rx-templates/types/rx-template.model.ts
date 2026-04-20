export interface RxTemplateMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface RxTemplateData {
  chief_complaint?: string;
  diagnoses?: string[];
  tests?: string[];
  advice?: string[];
  medicines?: RxTemplateMedicine[];
  follow_up?: string;
  notes?: string;
  tags?: string[];
}

export interface RxTemplateRow {
  id: string;
  team_id: string;
  doctor_id: string | null;
  name: string;
  description: string | null;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
  data: RxTemplateData;
}

export interface RxTemplateResource {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  chiefComplaint?: string;
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxTemplateMedicine[];
  followUp?: string;
  notes?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  shared: boolean;
}
