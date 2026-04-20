import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import {
  BillingCycle,
  InvoiceData,
  InvoiceResource,
  InvoiceRow,
  InvoiceStatus,
  PlanId,
} from './types/invoice.model';
import { invoiceResource } from './transformers/invoice.resource';

@Injectable()
export class InvoicesRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async createPending(input: {
    teamId: string;
    periodStart: Date;
    periodEnd: Date;
    amountBdt: number;
    tranId: string;
    planId: PlanId;
    cycle: BillingCycle;
    lineItems?: InvoiceData['line_items'];
    subscriptionBdt?: number;
    usageBdt?: number;
  }): Promise<InvoiceResource> {
    const client = await this.getClient();
    const data: InvoiceData = {
      plan_id: input.planId,
      cycle: input.cycle,
      line_items: input.lineItems ?? [],
      subscription_bdt: input.subscriptionBdt ?? input.amountBdt,
      usage_bdt: input.usageBdt ?? 0,
    };
    const r = await client.query<InvoiceRow>(
      `INSERT INTO invoices
         (team_id, period_start, period_end, amount_bdt, status,
          sslcommerz_tran_id, data)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6::jsonb)
       RETURNING *`,
      [
        input.teamId,
        input.periodStart.toISOString(),
        input.periodEnd.toISOString(),
        input.amountBdt,
        input.tranId,
        JSON.stringify(data),
      ],
    );
    return invoiceResource.transform(r.rows[0]);
  }

  async setStatusByTranId(
    tranId: string,
    status: InvoiceStatus,
    patch?: Partial<InvoiceData>,
  ): Promise<InvoiceResource> {
    const client = await this.getClient();
    const r = await client.query<InvoiceRow>(
      `UPDATE invoices SET
          status = $2,
          data = CASE WHEN $3::jsonb IS NULL THEN data ELSE data || $3::jsonb END,
          updated_at = now()
        WHERE sslcommerz_tran_id = $1
        RETURNING *`,
      [tranId, status, patch ? JSON.stringify(patch) : null],
    );
    if (!r.rows.length) throw new NotFoundException('Invoice not found');
    return invoiceResource.transform(r.rows[0]);
  }

  async findByTranId(tranId: string): Promise<InvoiceResource | null> {
    const r = await this.findRowByTranId(tranId);
    return r ? invoiceResource.transform(r) : null;
  }

  async findRowByTranId(tranId: string): Promise<InvoiceRow | null> {
    const client = await this.getClient();
    const r = await client.query<InvoiceRow>(
      `SELECT * FROM invoices WHERE sslcommerz_tran_id = $1 LIMIT 1`,
      [tranId],
    );
    return r.rows[0] ?? null;
  }

  async listForTeam(teamId: string): Promise<InvoiceResource[]> {
    const client = await this.getClient();
    const r = await client.query<InvoiceRow>(
      `SELECT * FROM invoices
        WHERE team_id = $1
        ORDER BY created_at DESC`,
      [teamId],
    );
    return invoiceResource.transformCollection(r.rows);
  }
}
