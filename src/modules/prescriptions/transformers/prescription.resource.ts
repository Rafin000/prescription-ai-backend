import { makeTransformer } from 'src/base/base.transformer';
import {
  PrescriptionResource,
  PrescriptionRow,
} from '../types/prescription.model';

export const prescriptionResource = makeTransformer<PrescriptionRow, PrescriptionResource>(
  (row) => {
    const data = row.data ?? {};
    return {
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      date: (row.finalised_at ?? row.created_at).toISOString(),
      chiefComplaint: data.chief_complaint,
      diagnoses: data.diagnoses ?? [],
      tests: data.tests ?? [],
      advice: data.advice ?? [],
      medicines: data.medicines ?? [],
      followUp: data.follow_up,
      notes: data.notes,
      operation: data.operation,
      status: row.status === 'cancelled' ? 'draft' : row.status,
      printedAt: row.printed_at?.toISOString(),
      visitId: row.consult_id ?? undefined,
    };
  },
);
