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

  /* Dev-only stub landing page that the dev gateway URL points to.
   * Real SSLCommerz redirects the user back to successUrl/failUrl directly. */
  @Public()
  @Get('public/mock-sslcz/checkout')
  mockCheckout(
    @Query('tran_id') tranId: string,
    @Res() res: Response,
  ) {
    res
      .status(200)
      .set('content-type', 'text/html')
      .send(`<!doctype html>
<meta charset="utf-8">
<title>SSLCommerz (dev mock)</title>
<body style="font: 14px/1.5 system-ui; max-width:560px;margin:60px auto;padding:0 16px">
  <h2>SSLCommerz — dev mock</h2>
  <p>Transaction <code>${escapeHtml(tranId)}</code> is simulated.</p>
  <p>Paste this tran_id into the dashboard's "verify checkout" step:</p>
  <pre style="background:#eee;padding:12px;border-radius:6px">${escapeHtml(tranId)}</pre>
  <p>The real hosted page shows the card/bKash/Nagad picker here.</p>
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
