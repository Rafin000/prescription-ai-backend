import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendInput {
  to: string;
  body: string;
}

export interface SmsSendResult {
  ok: boolean;
  providerResponse?: unknown;
  error?: string;
}

/**
 * Bangladesh SMS gateway wrapper (SSL Wireless / Alpha-SMS). Stubbed in dev —
 * logs the would-be SMS so flows are visible. Real POST goes in the moment
 * `SMS_API_KEY` is populated.
 */
@Injectable()
export class SmsProvider {
  private readonly log = new Logger(SmsProvider.name);
  constructor(private readonly config: ConfigService) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const apiKey = this.config.get<string>('SMS_API_KEY');
    if (!apiKey) {
      this.log.log(`[stub SMS] → ${input.to}: ${input.body}`);
      return { ok: true, providerResponse: { stub: true } };
    }
    return {
      ok: false,
      error: 'Real SMS provider not wired yet (set SMS_API_KEY)',
    };
  }
}
