import { makeTransformer } from 'src/base/base.transformer';
import { RxTemplateResource, RxTemplateRow } from '../types/rx-template.model';

export const rxTemplateResource = makeTransformer<RxTemplateRow, RxTemplateResource>(
  (row) => {
    const d = row.data ?? {};
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      tags: d.tags ?? [],
      chiefComplaint: d.chief_complaint,
      diagnoses: d.diagnoses ?? [],
      tests: d.tests ?? [],
      advice: d.advice ?? [],
      medicines: d.medicines ?? [],
      followUp: d.follow_up,
      notes: d.notes,
      usageCount: row.usage_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      shared: row.doctor_id === null,
    };
  },
);
