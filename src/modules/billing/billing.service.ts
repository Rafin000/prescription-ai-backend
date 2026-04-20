import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { SubscriptionsRepository } from 'src/modules/subscriptions/subscriptions.repository';
import { TeamsRepository } from 'src/modules/teams/teams.repository';
import { UsersRepository } from 'src/modules/users/users.repository';
import { InvoicesRepository } from 'src/modules/invoices/invoices.repository';
import { UsageRepository } from 'src/modules/usage/usage.repository';
import { SslCommerzProvider } from 'src/integrations/sslcommerz/sslcommerz.provider';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import {
  ChangePlanDto,
  InitiateCheckoutDto,
  IpnDto,
  VerifyCheckoutDto,
} from './dtos/checkout.dto';
import { toMeResource, MeResource } from 'src/modules/auth/transformers/me.resource';
import { ROLES } from 'src/base/base.constants';
import { InvoiceResource } from 'src/modules/invoices/types/invoice.model';
import { ConfigService } from '@nestjs/config';

const PLAN_PRICE_BDT: Record<
  'starter' | 'pro' | 'clinic',
  Record<'monthly' | 'yearly', number>
> = {
  starter: { monthly: 1500, yearly: 15000 },
  pro: { monthly: 2500, yearly: 25000 },
  clinic: { monthly: 5000, yearly: 50000 },
};

@Injectable()
export class BillingService {
  constructor(
    private readonly doctors: DoctorsRepository,
    private readonly subs: SubscriptionsRepository,
    private readonly teams: TeamsRepository,
    private readonly users: UsersRepository,
    private readonly invoices: InvoicesRepository,
    private readonly usage: UsageRepository,
    private readonly gateway: SslCommerzProvider,
    private readonly notifs: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async initiate(
    teamId: string,
    userId: string,
    dto: InitiateCheckoutDto,
  ): Promise<{
    gatewayUrl: string;
    tranId: string;
    sessionKey: string;
    amountBdt: number;
  }> {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User missing');

    const amount = PLAN_PRICE_BDT[dto.planId][dto.cycle];
    const tranId = `PAI-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const now = new Date();
    const end = new Date(now);
    if (dto.cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    await this.invoices.createPending({
      teamId,
      periodStart: now,
      periodEnd: end,
      amountBdt: amount,
      tranId,
      planId: dto.planId,
      cycle: dto.cycle,
      lineItems: [
        {
          id: randomUUID(),
          kind: 'subscription',
          label: `${capitalise(dto.planId)} plan · ${dto.cycle}`,
          amount_bdt: amount,
        },
      ],
      subscriptionBdt: amount,
    });

    const publicBase = this.config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:4000';
    const session = await this.gateway.initSession({
      tranId,
      amountBdt: amount,
      productName: `Prescription AI — ${capitalise(dto.planId)} ${dto.cycle}`,
      customerEmail: user.email ?? 'billing@prescription.ai',
      customerPhone: user.data?.phone,
      successUrl: dto.successUrl,
      failUrl: dto.failUrl,
      cancelUrl: dto.cancelUrl,
      ipnUrl: `${publicBase}/api/public/billing/sslcz/ipn`,
    });

    // Stash gateway session in case we need to reconcile later.
    await this.invoices.setStatusByTranId(tranId, 'pending', {
      gateway_url: session.gatewayUrl,
      session_key: session.sessionKey,
    });

    return {
      gatewayUrl: session.gatewayUrl,
      tranId,
      sessionKey: session.sessionKey,
      amountBdt: amount,
    };
  }

  async verify(
    teamId: string,
    userId: string,
    dto: VerifyCheckoutDto,
  ): Promise<{
    doctor: MeResource;
    subscription: MeResource['subscription'];
    invoice: InvoiceResource;
  }> {
    const invoice = await this.invoices.findByTranId(dto.tranId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') {
      const me = await this.compose(teamId, userId);
      return { doctor: me, subscription: me.subscription, invoice };
    }

    const result = await this.gateway.validate(dto.tranId);
    if (!result.valid) {
      await this.invoices.setStatusByTranId(dto.tranId, 'failed', {
        method: result.method,
        method_hint: result.methodHint,
      });
      throw new BadRequestException('Payment failed');
    }

    await this.subs.recordCheckout(
      teamId,
      invoice.planId,
      invoice.cycle,
      invoice.amountBdt,
      dto.tranId,
    );
    const paid = await this.invoices.setStatusByTranId(dto.tranId, 'paid', {
      method: result.method,
      method_hint: result.methodHint,
    });
    const me = await this.compose(teamId, userId);

    // Receipt email + in-app bell.
    const user = await this.users.findById(userId);
    if (user?.email) {
      await this.notifs.safeSendEmail({
        teamId,
        userId,
        kind: 'invoice.paid',
        to: user.email,
        subject: `Payment received — Prescription AI ৳${paid.amountBdt}`,
        html: `<p>Hi ${user.data?.name ?? 'there'},</p>
               <p>We received your payment of <strong>৳${paid.amountBdt}</strong>
               for the <strong>${paid.planId}</strong> plan (${paid.cycle}).</p>
               <p>Transaction: ${paid.tranId}<br/>Method: ${paid.method ?? 'card'}</p>
               <p>Thanks for using Prescription AI.</p>`,
        text: `Payment received ৳${paid.amountBdt} — plan ${paid.planId}/${paid.cycle}.`,
        dedupeKey: `invoice-paid-email:${paid.id}`,
      });
    }
    await this.notifs.safeSendInApp({
      teamId,
      userId,
      kind: 'invoice.paid',
      title: `Payment received — ৳${paid.amountBdt}`,
      body: `${paid.planId} plan (${paid.cycle}) · ${paid.method ?? 'card'}`,
      href: '/billing',
      severity: 'success',
      dedupeKey: `invoice-paid-inapp:${paid.id}`,
    });

    return { doctor: me, subscription: me.subscription, invoice: paid };
  }

  async listInvoices(teamId: string): Promise<InvoiceResource[]> {
    return this.invoices.listForTeam(teamId);
  }

  async cancel(
    teamId: string,
    userId: string,
  ): Promise<{ doctor: MeResource; subscription: MeResource['subscription'] }> {
    // Mark to cancel at period end — keep status active until then.
    const sub = await this.subs.ensureFor(teamId);
    const end = sub.current_period_end ?? new Date();
    await this.subs.markCancelAt(teamId, end);
    const me = await this.compose(teamId, userId);
    return { doctor: me, subscription: me.subscription };
  }

  async resume(
    teamId: string,
    userId: string,
  ): Promise<{ doctor: MeResource; subscription: MeResource['subscription'] }> {
    await this.subs.clearCancelAt(teamId);
    const me = await this.compose(teamId, userId);
    return { doctor: me, subscription: me.subscription };
  }

  async changePlan(
    teamId: string,
    userId: string,
    dto: ChangePlanDto,
  ) {
    return this.initiate(teamId, userId, dto);
  }

  /** Server-to-server IPN from SSLCommerz. Best-effort — the `verify` call is
   *  the source of truth; this just catches async completions. */
  async handleIpn(payload: IpnDto): Promise<{ ok: true }> {
    if (!payload.tran_id) return { ok: true };
    const row = await this.invoices.findRowByTranId(payload.tran_id);
    if (!row) return { ok: true };

    const result = await this.gateway.validate(payload.tran_id);
    if (result.valid && row.status !== 'paid') {
      const planId = row.data.plan_id ?? 'starter';
      const cycle = row.data.cycle ?? 'monthly';
      await this.subs.recordCheckout(
        row.team_id,
        planId,
        cycle,
        row.amount_bdt,
        payload.tran_id,
      );
      await this.invoices.setStatusByTranId(payload.tran_id, 'paid', {
        method: result.method,
        method_hint: result.methodHint,
      });
    } else if (!result.valid) {
      await this.invoices.setStatusByTranId(payload.tran_id, 'failed');
    }
    return { ok: true };
  }

  async upcoming(teamId: string, userId: string): Promise<InvoiceResource> {
    const sub = await this.subs.ensureFor(teamId);
    const planId = (sub.plan_id ?? 'starter') as 'starter' | 'pro' | 'clinic';
    const cycle = (sub.cycle ?? 'monthly') as 'monthly' | 'yearly';
    const subAmount = PLAN_PRICE_BDT[planId][cycle];

    const now = new Date();
    const periodStart = sub.current_period_end
      ? new Date(sub.current_period_end)
      : now;
    const periodEnd = new Date(periodStart);
    if (cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const totals = await this.usage.totals(teamId, periodStart, now);
    const usageBdt = Math.round(Number(totals.totalCostBdt));

    return {
      id: `upcoming-${teamId}`,
      tranId: '',
      planId,
      cycle,
      amountBdt: subAmount + usageBdt,
      subscriptionBdt: subAmount,
      usageBdt,
      lineItems: [
        {
          id: 'sub',
          kind: 'subscription',
          label: `${capitalise(planId)} plan · ${cycle}`,
          amountBdt: subAmount,
        },
        ...(usageBdt > 0
          ? [{
              id: 'usage',
              kind: 'usage' as const,
              label: `AI usage · ${totals.totalTokens.toLocaleString()} tokens`,
              amountBdt: usageBdt,
              quantity: totals.totalTokens,
              quantityUnit: 'tokens',
            }]
          : []),
      ],
      status: 'upcoming',
      createdAt: now.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  private async compose(teamId: string, userId: string): Promise<MeResource> {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    const membership = await this.teams.findMembership({ userId });
    if (!membership) throw new BadRequestException('No membership');
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor) throw new BadRequestException('Doctor profile missing');
    const sub = await this.subs.ensureFor(teamId);
    const rich = await this.doctors.getRichRowById(teamId, doctor.id);
    return toMeResource({
      user,
      doctor: rich,
      role: membership.role,
      isOwner: membership.role === ROLES.OWNER,
      subscription: sub,
    });
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
