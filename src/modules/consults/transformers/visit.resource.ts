import { makeTransformer } from 'src/base/base.transformer';
import { ConsultRow, VisitResource } from '../types/consult.model';

type VisitRow = ConsultRow & {
  prescription_id: string | null;
  prescription_data: {
    chief_complaint?: string;
    diagnoses?: string[];
    [k: string]: unknown;
  } | null;
  patient_name: string | null;
};

export const visitResource = makeTransformer<VisitRow, VisitResource>((row) => {
  const rxData = row.prescription_data ?? {};
  const chiefComplaint =
    (rxData as { chief_complaint?: string }).chief_complaint ??
    row.data?.chief_complaint_cache ??
    '';
  const diagnoses =
    ((rxData as { diagnoses?: string[] }).diagnoses ?? row.data?.diagnoses_cache ?? []) as string[];
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName:
      row.patient_name ??
      row.data?.patient_name_cache ??
      undefined,
    date: row.started_at.toISOString(),
    type: row.type,
    duration: row.duration_sec ? formatDuration(row.duration_sec) : undefined,
    chiefComplaint,
    diagnoses,
    prescriptionId: row.prescription_id ?? undefined,
    rxStatus: row.rx_status,
    printed: row.printed,
  };
});

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const min = Math.round(sec / 60);
  return `${min} min`;
}
