import { makeTransformer } from 'src/base/base.transformer';
import { InvoiceResource, InvoiceRow } from '../types/invoice.model';

export const invoiceResource = makeTransformer<InvoiceRow, InvoiceResource>((row) => {
  const data = row.data ?? {};
  const lineItems = data.line_items ?? [];
  return {
    id: row.id,
    tranId: row.sslcommerz_tran_id ?? '',
    planId: data.plan_id ?? 'starter',
    cycle: data.cycle ?? 'monthly',
    amountBdt: row.amount_bdt,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      kind: li.kind,
      label: li.label,
      usageKind: li.usage_kind,
      quantity: li.quantity,
      quantityUnit: li.quantity_unit,
      unitPriceBdt: li.unit_price_bdt,
      amountBdt: li.amount_bdt,
    })),
    subscriptionBdt: data.subscription_bdt ?? 0,
    usageBdt: data.usage_bdt ?? 0,
    method: data.method,
    methodHint: data.method_hint,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    periodStart: row.period_start.toISOString(),
    periodEnd: row.period_end.toISOString(),
    receiptUrl: data.receipt_url,
  };
});
