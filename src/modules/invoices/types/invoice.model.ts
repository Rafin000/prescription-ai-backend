export type PlanId = 'starter' | 'pro' | 'clinic';
export type BillingCycle = 'monthly' | 'yearly';
export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'upcoming';

export type UsageKind = 'transcription' | 'ai-fill' | 'talk-to-ai' | 'summary' | 'other';

export interface InvoiceLineItem {
  id: string;
  kind: 'subscription' | 'usage';
  label: string;
  usage_kind?: UsageKind;
  quantity?: number;
  quantity_unit?: string;
  unit_price_bdt?: number;
  amount_bdt: number;
}

export interface InvoiceData {
  plan_id?: PlanId;
  cycle?: BillingCycle;
  method?: string;
  method_hint?: string;
  line_items?: InvoiceLineItem[];
  subscription_bdt?: number;
  usage_bdt?: number;
  receipt_url?: string;
  pdf_s3_key?: string;
  gateway_url?: string;
  session_key?: string;
}

export interface InvoiceRow {
  id: string;
  team_id: string;
  period_start: Date;
  period_end: Date;
  amount_bdt: number;
  status: InvoiceStatus;
  sslcommerz_tran_id: string | null;
  created_at: Date;
  updated_at: Date;
  data: InvoiceData;
}

export interface InvoiceResource {
  id: string;
  tranId: string;
  planId: PlanId;
  cycle: BillingCycle;
  amountBdt: number;
  lineItems: Array<{
    id: string;
    kind: 'subscription' | 'usage';
    label: string;
    usageKind?: UsageKind;
    quantity?: number;
    quantityUnit?: string;
    unitPriceBdt?: number;
    amountBdt: number;
  }>;
  subscriptionBdt: number;
  usageBdt: number;
  method?: string;
  methodHint?: string;
  status: InvoiceStatus;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  receiptUrl?: string;
}
