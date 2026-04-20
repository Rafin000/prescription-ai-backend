import { makeTransformer } from 'src/base/base.transformer';
import { MedicineResource, MedicineRow } from '../types/medicine.model';

export const medicineResource = makeTransformer<MedicineRow, MedicineResource>((row) => ({
  id: row.id,
  brand: row.brand,
  generic: row.generic,
  strength: row.strength ?? '',
  company: row.company ?? '',
  form: row.form ?? undefined,
  rating: row.rating == null ? undefined : Number(row.rating),
  doctorNote: row.data?.doctor_note,
}));
