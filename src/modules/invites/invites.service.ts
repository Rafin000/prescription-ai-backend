import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { TeamsRepository } from 'src/modules/teams/teams.repository';
import { UsersRepository } from 'src/modules/users/users.repository';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from './invites.repository';
import { AcceptInviteDto, CreateInviteDto } from './dtos/invite.dto';
import { ROLES } from 'src/base/base.constants';

const INVITE_EXPIRES_DAYS = 14;

@Injectable()
export class InvitesService {
  constructor(
    private readonly repo: InvitesRepository,
    private readonly users: UsersRepository,
    private readonly teams: TeamsRepository,
    private readonly doctors: DoctorsRepository,
    private readonly notifs: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  list(teamId: string) {
    return this.repo.list(teamId);
  }

  async create(teamId: string, userId: string, dto: CreateInviteDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      const membership = await this.teams.findMembership({ userId: existing.id });
      if (membership?.team_id === teamId) {
        throw new ConflictException('Already a member of this team');
      }
    }
    if (dto.role === ROLES.OWNER) {
      throw new BadRequestException('Cannot invite a second admin');
    }
    const invite = await this.repo.create({
      teamId,
      email: dto.email,
      role: dto.role,
      invitedBy: userId,
      token: this.mintToken(),
      expiresAt: this.defaultExpiresAt(),
      message: dto.message,
    });
    await this.dispatchInviteEmail(teamId, invite.email, invite.token, dto.message);
    return invite;
  }

  async revoke(teamId: string, inviteId: string) {
    const inv = await this.repo.findById(teamId, inviteId);
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.status !== 'pending') {
      throw new BadRequestException('Only pending invites can be revoked');
    }
    await this.repo.setStatus(inv.id, 'revoked');
  }

  async resend(teamId: string, inviteId: string) {
    const inv = await this.repo.findById(teamId, inviteId);
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.status === 'accepted') {
      throw new BadRequestException('Invite already accepted');
    }
    const refreshed = await this.repo.refreshToken(
      inv.id,
      this.mintToken(),
      this.defaultExpiresAt(),
    );
    await this.dispatchInviteEmail(teamId, refreshed.email, refreshed.token);
    return refreshed;
  }

  async getPublic(token: string) {
    const row = await this.repo.findRowByToken(token);
    if (!row) throw new NotFoundException('Invalid link');
    // Expire opportunistically on read.
    if (row.status === 'pending' && row.expires_at < new Date()) {
      await this.repo.setStatus(row.id, 'expired');
      row.status = 'expired';
    }
    return this.repo.toPublic(row);
  }

  async accept(dto: AcceptInviteDto): Promise<{ ok: true }> {
    const row = await this.repo.findRowByToken(dto.token);
    if (!row) throw new NotFoundException('Invalid link');
    if (row.status === 'accepted') throw new ConflictException('Invite already used');
    if (row.status === 'revoked') throw new ForbiddenException('Invite was revoked');
    if (row.expires_at < new Date()) {
      await this.repo.setStatus(row.id, 'expired');
      throw new ForbiddenException('Invite has expired');
    }

    const existing = await this.users.findByEmail(row.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      email: row.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
    });

    await this.teams.addMember({
      teamId: row.team_id,
      userId: user.id,
      role: row.role,
    });

    // Minimal "profile" row so /auth/me returns a uniform shape. Assistants
    // don't see the clinical UI but the auth store still expects this.
    await this.doctors.createForSignup({
      teamId: row.team_id,
      userId: user.id,
      name: dto.name,
      specialty: '—',
      phone: dto.phone,
      email: row.email,
    });
    await this.doctors
      .setOnboardingStep(row.team_id, (await this.doctors.findByUserId(user.id))!.id, 'done', true)
      .catch(() => undefined);

    await this.repo.setStatus(row.id, 'accepted', { accepted_user_id: user.id });
    return { ok: true };
  }

  private mintToken(): string {
    return randomBytes(24).toString('base64url');
  }

  private defaultExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + INVITE_EXPIRES_DAYS);
    return d;
  }

  private async dispatchInviteEmail(
    teamId: string,
    email: string,
    token: string,
    message?: string,
  ): Promise<void> {
    const dashboardUrl =
      this.config.get<string>('DASHBOARD_URL') ?? 'http://localhost:5174';
    const link = `${dashboardUrl}/invites/${token}`;
    const subject = 'You have been invited to Prescription AI';
    const html = `
      <p>Hello,</p>
      <p>You've been invited to join a team on Prescription AI.</p>
      ${message ? `<p><em>${escapeHtml(message)}</em></p>` : ''}
      <p>Accept the invite:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in ${INVITE_EXPIRES_DAYS} days.</p>
    `;
    const text = `You've been invited to Prescription AI. Accept at: ${link} (expires in ${INVITE_EXPIRES_DAYS} days)`;
    await this.notifs.safeSendEmail({
      teamId,
      kind: 'invite.sent',
      to: email,
      subject,
      html,
      text,
      dedupeKey: `invite-email:${token}`,
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}
