import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from 'src/decorators/public.decorator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import {
  ChangePlanDto,
  InitiateCheckoutDto,
  IpnDto,
  VerifyCheckoutDto,
} from './dtos/checkout.dto';

@Controller()
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Post('billing/sslcz/initiate')
  @HttpCode(200)
  initiate(@CurrentUser() u: AuthedUser, @Body() dto: InitiateCheckoutDto) {
    return this.svc.initiate(u.teamId, u.userId, dto);
  }

  @Post('billing/sslcz/verify')
  @HttpCode(200)
  verify(@CurrentUser() u: AuthedUser, @Body() dto: VerifyCheckoutDto) {
    return this.svc.verify(u.teamId, u.userId, dto);
  }

  @Post('billing/change-plan')
  @HttpCode(200)
  changePlan(@CurrentUser() u: AuthedUser, @Body() dto: ChangePlanDto) {
    return this.svc.changePlan(u.teamId, u.userId, dto);
  }

  @Get('billing/invoices')
  listInvoices(@CurrentUser() u: AuthedUser) {
    return this.svc.listInvoices(u.teamId);
  }

  @Get('billing/upcoming')
  upcoming(@CurrentUser() u: AuthedUser) {
    return this.svc.upcoming(u.teamId, u.userId);
  }

  @Post('billing/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthedUser) {
    return this.svc.cancel(u.teamId, u.userId);
  }

  @Post('billing/resume')
  @HttpCode(200)
  resume(@CurrentUser() u: AuthedUser) {
    return this.svc.resume(u.teamId, u.userId);
  }

  /* Public webhook — SSLCommerz POSTs form-encoded IPN. */
  @Public()
  @Post('public/billing/sslcz/ipn')
  @HttpCode(200)
  ipn(@Body() payload: IpnDto) {
    return this.svc.handleIpn(payload);
  }

  /* Dev-only stub landing page. Mirrors the real SSLCommerz UX: the user
   * picks Pay / Fail / Cancel, then the page redirects back to the
   * callback URL the dashboard passed into initiate() with ?tran_id=<id>. */
  @Public()
  @Get('public/mock-sslcz/checkout')
  mockCheckout(
    @Query('tran_id') tranId: string,
    @Query('amount') amount: string,
    @Query('product') product: string,
    @Query('success_url') successUrl: string,
    @Query('fail_url') failUrl: string,
    @Query('cancel_url') cancelUrl: string,
    @Res() res: Response,
  ) {
    const redir = (url: string) => {
      if (!url) return '';
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}tran_id=${encodeURIComponent(tranId)}`;
    };
    res
      .status(200)
      .set('content-type', 'text/html')
      .send(`<!doctype html>
<meta charset="utf-8">
<title>SSLCommerz (dev mock)</title>
<body style="font: 14px/1.5 system-ui; max-width:520px; margin:60px auto; padding:0 16px; color:#0f172a">
  <div style="border:1px solid #e5e7eb;border-radius:10px;padding:28px">
    <div style="font-size:11px;letter-spacing:1.2px;font-weight:700;color:#0d9488;text-transform:uppercase">SSLCommerz · dev mock</div>
    <h1 style="font-size:22px;margin:8px 0 4px">Pay ৳${escapeHtml(amount)}</h1>
    <div style="font-size:13px;color:#475569;margin-bottom:24px">${escapeHtml(product)}</div>
    <div style="font-size:12px;color:#94a3b8;margin-bottom:20px">tran_id · <code>${escapeHtml(tranId)}</code></div>
    <div style="display:flex;gap:8px;flex-direction:column">
      <a href="${escapeHtml(redir(successUrl))}"
         style="background:#0d9488;color:white;padding:12px 16px;border-radius:8px;text-decoration:none;text-align:center;font-weight:600">
        Pay (simulate success)
      </a>
      <a href="${escapeHtml(redir(failUrl))}"
         style="background:#fee2e2;color:#b91c1c;padding:12px 16px;border-radius:8px;text-decoration:none;text-align:center;font-weight:600">
        Decline (simulate failure)
      </a>
      <a href="${escapeHtml(redir(cancelUrl))}"
         style="background:#f1f5f9;color:#334155;padding:12px 16px;border-radius:8px;text-decoration:none;text-align:center;font-weight:600">
        Cancel
      </a>
    </div>
    <p style="font-size:11px;color:#94a3b8;margin-top:20px">
      Real SSLCommerz shows a card / bKash / Nagad / Rocket picker here.
      This stub goes away automatically once <code>SSLCOMMERZ_STORE_ID</code>
      is set in the backend env.
    </p>
  </div>
</body>`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));
}
