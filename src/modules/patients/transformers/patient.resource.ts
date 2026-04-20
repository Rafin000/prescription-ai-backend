import { makeTransformer } from 'src/base/base.transformer';
import {
  PatientResource,
  PatientWithPiiRow,
  Sex,
} from '../types/patient.model';

export const patientResource = makeTransformer<PatientWithPiiRow, PatientResource>(
  (row) => {
    const pii = row.pii ?? { name: '' };
    const data = row.data ?? {};
    return {
      id: row.id,
      code: row.code,
      name: pii.name ?? '',
      nameBn: pii.name_bn ?? undefined,
      age: data.age ?? 0,
      sex: (data.sex ?? 'other') as Sex,
      phone: (pii.phones && pii.phones[0]) ?? '',
      address: (pii.addresses && pii.addresses[0]) ?? '',
      bloodGroup: data.blood_group ?? undefined,
      allergies: data.allergies ?? undefined,
      conditions: data.conditions?.map((c) => ({
        name: c.name,
        diagnosedYear: c.diagnosed_year,
        status: c.status,
      })),
      emergencyContact: data.emergency_contact ?? undefined,
      patientSince: row.patient_since.toISOString(),
      visits: data.visits_count ?? 0,
      avatarUrl: data.avatar_url ?? undefined,
      surgicalPlan: data.surgical_plan ?? null,
    };
  },
);
