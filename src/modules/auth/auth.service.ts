import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { Role, ROLES } from 'src/base/base.constants';
import { UsersRepository } from 'src/modules/users/users.repository';
import { TeamsRepository } from 'src/modules/teams/teams.repository';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { SubscriptionsRepository } from 'src/modules/subscriptions/subscriptions.repository';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { MeResource, toMeResource } from './transformers/me.resource';

const COOKIE_NAME = 'pai_session';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly teams: TeamsRepository,
    private readonly doctors: DoctorsRepository,
    private readonly subs: SubscriptionsRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(
    dto: SignupDto,
    res: Response,
  ): Promise<{ user: MeResource; accessToken: string }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
    });

    const team = await this.teams.create({
      name: dto.teamName ?? `${dto.name}'s practice`,
      billingEmail: dto.email,
    });

    await this.teams.addMember({
      teamId: team.id,
      userId: user.id,
      role: ROLES.OWNER,
    });

    const doctor = await this.doctors.createForSignup({
      teamId: team.id,
      userId: user.id,
      name: dto.name,
      specialty: dto.specialty,
      bmdcNo: dto.bmdcNo,
      phone: dto.phone,
      email: dto.email,
    });

    const subscription = await this.subs.ensureFor(team.id);

    const token = this.signAndSet(res, {
      sub: user.id,
      teamId: team.id,
      role: ROLES.OWNER,
      onboardingComplete: false,
    });

    const rich = await this.doctors.getRichRowById(team.id, doctor.id);
    return {
      user: toMeResource({
        user,
        doctor: rich,
        role: ROLES.OWNER,
        isOwner: true,
        subscription,
      }),
      accessToken: token,
    };
  }

  async login(
    dto: LoginDto,
    res: Response,
  ): Promise<{ user: MeResource; accessToken: string }> {
    const user = await this.users.findByEmail(dto.identifier);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const membership = await this.teams.findMembership({ userId: user.id });
    if (!membership) throw new BadRequestException('No active team membership');

    await this.users.touchLogin(user.id);

    const doctor = await this.doctors.findByUserId(user.id);
    if (!doctor) throw new BadRequestException('Doctor profile missing');
    const subscription = await this.subs.ensureFor(membership.team_id);

    const token = this.signAndSet(res, {
      sub: user.id,
      teamId: membership.team_id,
      role: membership.role,
      onboardingComplete: doctor.onboarding_complete,
    });

    const rich = await this.doctors.getRichRowById(membership.team_id, doctor.id);
    return {
      user: toMeResource({
        user,
        doctor: rich,
        role: membership.role,
        isOwner: membership.role === ROLES.OWNER,
        subscription,
      }),
      accessToken: token,
    };
  }

  async refresh(
    userId: string,
    res: Response,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const membership = await this.teams.findMembership({ userId });
    if (!membership) throw new UnauthorizedException('No membership');
    const doctor = await this.doctors.findByUserId(userId);
    const token = this.signAndSet(res, {
      sub: user.id,
      teamId: membership.team_id,
      role: membership.role,
      onboardingComplete: !!doctor?.onboarding_complete,
    });
    return { accessToken: token, refreshToken: token };
  }

  async me(userId: string): Promise<MeResource> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const membership = await this.teams.findMembership({ userId });
    if (!membership) throw new UnauthorizedException('No membership');
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor) throw new UnauthorizedException('Doctor profile missing');
    const subscription = await this.subs.ensureFor(membership.team_id);
    const rich = await this.doctors.getRichRowById(membership.team_id, doctor.id);
    return toMeResource({
      user,
      doctor: rich,
      role: membership.role,
      isOwner: membership.role === ROLES.OWNER,
      subscription,
    });
  }

  async logout(res: Response): Promise<void> {
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      domain: this.config.get<string>('COOKIE_DOMAIN') || undefined,
    });
  }

  /**
   * Signs the JWT, sets the `pai_session` cookie, and returns the raw token
   * so we can also put it in the response body for SPAs that prefer Bearer.
   */
  private signAndSet(
    res: Response,
    payload: {
      sub: string;
      teamId: string;
      role: Role;
      onboardingComplete: boolean;
    },
  ): string {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const token = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn,
    });
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    const maxAgeMs = parseDurationMs(expiresIn);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: maxAgeMs,
      domain: this.config.get<string>('COOKIE_DOMAIN') || undefined,
    });
    return token;
  }
}

/** Minimal duration parser: 7d / 24h / 30m / 3600s / number-as-ms. */
function parseDurationMs(v: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(v);
  if (!m) return Number(v) || 7 * 86_400_000;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's': return n * 1_000;
    case 'm': return n * 60_000;
    case 'h': return n * 3_600_000;
    case 'd': return n * 86_400_000;
  }
  return 7 * 86_400_000;
}
