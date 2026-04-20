import { BadRequestException, Injectable } from '@nestjs/common';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { ChambersRepository } from 'src/modules/chambers/chambers.repository';
import { SubscriptionsRepository } from 'src/modules/subscriptions/subscriptions.repository';
import { UsersRepository } from 'src/modules/users/users.repository';
import { TeamsRepository } from 'src/modules/teams/teams.repository';
import { OnboardingRepository } from './onboarding.repository';
import { MeResource, toMeResource } from 'src/modules/auth/transformers/me.resource';
import { SaveProfileDto } from './dtos/save-profile.dto';
import { SaveChambersDto } from './dtos/save-chambers.dto';
import { SaveAvailabilityDto } from './dtos/save-availability.dto';
import { SavePreferencesBody } from './dtos/save-preferences.dto';
import { SkipStepDto } from './dtos/skip-step.dto';
import { CheckoutDto } from './dtos/checkout.dto';
import { ROLES, Role } from 'src/base/base.constants';
import { randomUUID } from 'crypto';
import { OnboardingStep } from 'src/modules/doctors/types/doctor.model';

const STEP_ORDER: OnboardingStep[] = [
  'profile',
  'chambers',
  'availability',
  'preferences',
  'team',
  'payment',
  'done',
];

const PLAN_PRICE_BDT: Record<'starter' | 'pro' | 'clinic', Record<'monthly' | 'yearly', number>> = {
  starter: { monthly: 1500, yearly: 15000 },
  pro:     { monthly: 2500, yearly: 25000 },
  clinic:  { monthly: 5000, yearly: 50000 },
};

@Injectable()
export class OnboardingService {
  constructor(
    private readonly doctors: DoctorsRepository,
    private readonly chambers: ChambersRepository,
    private readonly subs: SubscriptionsRepository,
    private readonly users: UsersRepository,
    private readonly teams: TeamsRepository,
    private readonly progress: OnboardingRepository,
  ) {}

  async saveProfile(
    teamId: string,
    userId: string,
    role: Role,
    dto: SaveProfileDto,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }

    await this.doctors.updateProfile(teamId, doctor.id, {
      name: dto.name,
      specialty: dto.specialty,
      bmdcNo: dto.bmdcNo,
      phone: dto.phone,
      email: dto.email,
      dataMerge: {
        name_bn: dto.nameBn ?? null,
        degrees: dto.degrees,
        signature_url: dto.signatureUrl ?? null,
      },
    });
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: 'profile',
      payload: { ...dto },
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'chambers', false);
    return this.compose(teamId, userId, role);
  }

  async saveChambers(
    teamId: string,
    userId: string,
    role: Role,
    dto: SaveChambersDto,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    await this.chambers.replaceForDoctor(
      teamId,
      doctor.id,
      dto.chambers.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        timeLabel: c.time,
        area: c.area,
        city: c.city,
        lat: c.lat,
        lng: c.lng,
      })),
    );
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: 'chambers',
      payload: { count: dto.chambers.length },
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'availability', false);
    return this.compose(teamId, userId, role);
  }

  async saveAvailability(
    teamId: string,
    userId: string,
    role: Role,
    dto: SaveAvailabilityDto,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    await this.doctors.updateProfile(teamId, doctor.id, {
      dataMerge: { availability: dto.availability },
    });
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: 'availability',
      payload: dto.availability as unknown as Record<string, unknown>,
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'preferences', false);
    return this.compose(teamId, userId, role);
  }

  async savePreferences(
    teamId: string,
    userId: string,
    role: Role,
    body: SavePreferencesBody,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    await this.doctors.updateProfile(teamId, doctor.id, {
      dataMerge: { preferences: body.preferences },
    });
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: 'preferences',
      payload: body.preferences as unknown as Record<string, unknown>,
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'team', false);
    return this.compose(teamId, userId, role);
  }

  async skip(
    teamId: string,
    userId: string,
    role: Role,
    dto: SkipStepDto,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    const idx = STEP_ORDER.indexOf(dto.step as OnboardingStep);
    const next = STEP_ORDER[idx + 1] ?? 'done';
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: dto.step,
      payload: { skipped: true },
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, next, next === 'done');
    return this.compose(teamId, userId, role);
  }

  /**
   * Mock checkout — returns a fake "active" subscription, tranId. Real
   * SSLCommerz integration lands in slice 6.
   */
  async checkout(
    teamId: string,
    userId: string,
    role: Role,
    dto: CheckoutDto,
  ): Promise<{ doctor: MeResource; subscription: { status: string; planId: string; cycle: string; amountBdt: number; lastTranId: string } }> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    const amount = PLAN_PRICE_BDT[dto.planId][dto.cycle];
    const tranId = `MOCK-${randomUUID()}`;
    const sub = await this.subs.recordCheckout(
      teamId,
      dto.planId,
      dto.cycle,
      amount,
      tranId,
    );
    await this.progress.upsertStep({
      teamId,
      doctorId: doctor.id,
      step: 'payment',
      payload: { planId: dto.planId, cycle: dto.cycle, method: dto.method, amount },
      completed: true,
    });
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'done', true);
    const me = await this.compose(teamId, userId, role);
    return {
      doctor: me,
      subscription: {
        status: sub.status,
        planId: dto.planId,
        cycle: dto.cycle,
        amountBdt: amount,
        lastTranId: tranId,
      },
    };
  }

  async finish(
    teamId: string,
    userId: string,
    role: Role,
  ): Promise<MeResource> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor || doctor.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    await this.doctors.setOnboardingStep(teamId, doctor.id, 'done', true);
    return this.compose(teamId, userId, role);
  }

  private async compose(
    teamId: string,
    userId: string,
    role: Role,
  ): Promise<MeResource> {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor) throw new BadRequestException('Doctor profile missing');
    const subscription = await this.subs.ensureFor(teamId);
    const rich = await this.doctors.getRichRowById(teamId, doctor.id);
    return toMeResource({
      user,
      doctor: rich,
      role,
      isOwner: role === ROLES.OWNER,
      subscription,
    });
  }
}
