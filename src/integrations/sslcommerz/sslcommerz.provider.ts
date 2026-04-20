import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface InitSessionInput {
  tranId: string;
  amountBdt: number;
  productName: string;
  customerEmail: string;
  customerPhone?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface InitSessionResult {
  gatewayUrl: string;
  sessionKey: string;
}

export interface ValidateResult {
  valid: boolean;
  status: 'VALID' | 'VALIDATED' | 'INVALID_TRANSACTION' | 'FAILED' | 'CANCELLED';
  method?: string;
  methodHint?: string;
  raw: Record<string, unknown>;
}

/**
 * SSLCommerz hosted-checkout wrapper.
 *
 * In dev we run a stub: initSession returns a gateway URL that points back
 * at our own mock success page, validate always returns VALID. Real sandbox
 * calls (api.sslcommerz.com) light up automatically once SSLCOMMERZ_STORE_ID
 * + SSLCOMMERZ_STORE_PASSWD are set AND the stub flag is off.
 *
 * Swap behaviour per env — interface stays the same.
 */
@Injectable()
export class SslCommerzProvider {
  private readonly log = new Logger(SslCommerzProvider.name);
  constructor(private readonly config: ConfigService) {}

  async initSession(input: InitSessionInput): Promise<InitSessionResult> {
    const storeId = this.config.get<string>('SSLCOMMERZ_STORE_ID');
    if (!storeId) {
      // Dev stub — the mock page renders a Pay / Fail / Cancel picker that
      // redirects back to the dashboard's callback URLs with tran_id appended,
      // exactly like the real SSLCommerz hosted page does.
      const baseUrl =
        this.config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:4000';
      const params = new URLSearchParams({
        tran_id: input.tranId,
        amount: String(input.amountBdt),
        product: input.productName,
        success_url: input.successUrl,
        fail_url: input.failUrl,
        cancel_url: input.cancelUrl,
      });
      const gatewayUrl = `${baseUrl}/api/public/mock-sslcz/checkout?${params}`;
      const sessionKey = `stub-${randomUUID()}`;
      this.log.debug(`[stub] init session ${input.tranId}`);
      return { gatewayUrl, sessionKey };
    }
    // Real-sandbox path is a TODO — pattern is a POST to
    // https://sandbox.sslcommerz.com/gwprocess/v4/api.php with store creds +
    // transaction fields. Leaving a clear hook so slice 10 (hardening) lights it up.
    throw new Error('Real SSLCommerz integration not wired yet');
  }

  async validate(tranId: string): Promise<ValidateResult> {
    const storeId = this.config.get<string>('SSLCOMMERZ_STORE_ID');
    if (!storeId) {
      this.log.debug(`[stub] validate ${tranId} → VALID`);
      return {
        valid: true,
        status: 'VALID',
        method: 'card',
        methodHint: '**** 4242',
        raw: { stub: true, tran_id: tranId },
      };
    }
    throw new Error('Real SSLCommerz integration not wired yet');
  }
}
