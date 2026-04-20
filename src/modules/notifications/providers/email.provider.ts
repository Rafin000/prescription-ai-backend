import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  ok: boolean;
  providerResponse?: unknown;
  error?: string;
}

/** Resend wrapper. Stubbed in dev — logs the message body. */
@Injectable()
export class EmailProvider {
  private readonly log = new Logger(EmailProvider.name);
  constructor(private readonly config: ConfigService) {}

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.log.log(
        `[stub EMAIL] → ${input.to}  subject="${input.subject}"  preview="${input.text?.slice(0, 80) ?? input.html.slice(0, 80)}…"`,
      );
      return { ok: true, providerResponse: { stub: true } };
    }
    return {
      ok: false,
      error: 'Real Resend integration not wired yet (set RESEND_API_KEY)',
    };
  }
}
