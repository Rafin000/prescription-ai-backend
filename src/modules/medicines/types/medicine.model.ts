export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops';

export interface MedicineRow {
  id: string;
  team_id: string | null;
  brand: string;
  generic: string;
  strength: string | null;
  company: string | null;
  form: MedicineForm | null;
  rating: string | number | null;
  created_at: Date;
  updated_at: Date;
  data: { doctor_note?: string; aliases?: string[] };
}

export interface MedicineResource {
  id: string;
  brand: string;
  generic: string;
  strength: string;
  company: string;
  form?: MedicineForm;
  rating?: number;
  doctorNote?: string;
}
