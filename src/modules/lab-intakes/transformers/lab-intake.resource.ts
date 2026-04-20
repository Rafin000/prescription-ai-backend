import { makeTransformer } from 'src/base/base.transformer';
import { LabIntakeResource, LabIntakeRow } from '../types/lab-intake.model';

export const labIntakeResource = makeTransformer<LabIntakeRow, LabIntakeResource>(
  (row) => {
    const d = row.data ?? {};
    return {
      id: row.id,
      filename: d.filename ?? '',
      mime: d.mime ?? 'application/octet-stream',
      sizeKb: d.size_kb ?? 0,
      pages: d.pages,
      uploadedAt: row.uploaded_at.toISOString(),
      uploadedBy: row.uploaded_by ?? '',
      status: row.status,
      previewUrl: d.preview_url,
      note: d.note,
      extracted: d.extracted
        ? {
            patientName: d.extracted.patient_name,
            patientId: d.extracted.patient_id,
            testName: d.extracted.test_name,
            labName: d.extracted.lab_name,
            collectionDate: d.extracted.collection_date,
            summary: d.extracted.summary,
          }
        : undefined,
      suggestion: d.suggestion
        ? {
            patientId: d.suggestion.patient_id,
            patientName: d.suggestion.patient_name,
            testId: d.suggestion.test_id,
            testName: d.suggestion.test_name,
            confidence: d.suggestion.confidence,
            reason: d.suggestion.reason,
          }
        : undefined,
      routed: d.routed
        ? {
            patientId: d.routed.patient_id,
            patientName: d.routed.patient_name,
            testId: d.routed.test_id,
            testName: d.routed.test_name,
            labId: d.routed.lab_id,
            at: d.routed.at,
          }
        : undefined,
    };
  },
);
