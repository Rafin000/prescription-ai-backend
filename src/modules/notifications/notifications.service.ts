import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { SmsProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';

interface SendInAppInput {
  teamId: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  href?: string;
  severity?: 'info' | 'success' | 'warn' | 'danger';
  dedupeKey: string;
}

interface SendSmsInput {
  teamId: string;
  kind: string;
  to: string;
  body: string;
  dedupeKey: string;
}

interface SendEmailInput {
  teamId: string;
  userId?: string;
  kind: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  dedupeKey: string;
}

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
  ) {}

  async sendInApp(input: SendInAppInput) {
    const row = await this.repo.insert({
      teamId: input.teamId,
      userId: input.userId,
      kind: input.kind,
      channel: 'in-app',
      recipient: input.userId,
      status: 'sent',
      dedupeKey: input.dedupeKey,
      data: {
        title: input.title,
        body: input.body,
        href: input.href,
        severity: input.severity ?? 'info',
      },
    });
    return row;
  }

  async sendSms(input: SendSmsInput) {
    const row = await this.repo.insert({
      teamId: input.teamId,
      kind: input.kind,
      channel: 'sms',
      recipient: input.to,
      dedupeKey: input.dedupeKey,
      data: { body: input.body },
    });
    const res = await this.sms.send({ to: input.to, body: input.body });
    await this.repo.markResult(row.id, row.ts, {
      status: res.ok ? 'sent' : 'failed',
      providerResponse: res.providerResponse,
      error: res.error,
    });
    return row;
  }

  async sendEmail(input: SendEmailInput) {
    const row = await this.repo.insert({
      teamId: input.teamId,
      userId: input.userId,
      kind: input.kind,
      channel: 'email',
      recipient: input.to,
      dedupeKey: input.dedupeKey,
      data: { subject: input.subject, body: input.text ?? input.html.slice(0, 200) },
    });
    const res = await this.email.send({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    await this.repo.markResult(row.id, row.ts, {
      status: res.ok ? 'sent' : 'failed',
      providerResponse: res.providerResponse,
      error: res.error,
    });
    return row;
  }

  /** Fire-and-forget wrapper — swallow errors so domain flows never fail
   *  because an SMS provider blipped. */
  async safeSendSms(input: SendSmsInput) {
    try {
      return await this.sendSms(input);
    } catch (e) {
      this.log.warn(`safeSendSms failed: ${(e as Error).message}`);
    }
  }
  async safeSendEmail(input: SendEmailInput) {
    try {
      return await this.sendEmail(input);
    } catch (e) {
      this.log.warn(`safeSendEmail failed: ${(e as Error).message}`);
    }
  }
  async safeSendInApp(input: SendInAppInput) {
    try {
      return await this.sendInApp(input);
    } catch (e) {
      this.log.warn(`safeSendInApp failed: ${(e as Error).message}`);
    }
  }

  // ── read side ────────────────────────────────────────────
  list(teamId: string, userId: string, unreadOnly: boolean) {
    return this.repo.listForUser(teamId, userId, unreadOnly);
  }

  unreadCount(teamId: string, userId: string) {
    return this.repo.unreadCount(teamId, userId);
  }

  markRead(teamId: string, userId: string, id: string) {
    return this.repo.markRead(teamId, userId, id);
  }

  markAllRead(teamId: string, userId: string) {
    return this.repo.markAllRead(teamId, userId);
  }
}
