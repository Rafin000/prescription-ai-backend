import { Role } from 'src/base/base.constants';
import { DoctorListRow } from 'src/modules/doctors/types/doctor.model';
import { SubscriptionRow } from 'src/modules/subscriptions/subscriptions.repository';
import { UserRow } from 'src/modules/users/users.repository';
import { chamberResource } from 'src/modules/chambers/transformers/chamber.resource';

/** Shape the dashboard SPA's `Doctor` auth type. */
export interface MeResource {
  id: string;                 // doctor id
  userId: string;
  teamId: string;
  role: Role;
  isOwner: boolean;
  name: string;
  nameBn?: string;
  degrees: string[];
  specialty: string;
  focusAreas: string[];
  bmdcNo: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  chambers: Array<{
    id: string;
    name: string;
    address: string;
    phone?: string;
    days: string[];
    time: string;
    lat?: number;
    lng?: number;
    area?: string;
  }>;
  signatureUrl?: string;
  yearsOfExperience?: number;
  languages?: string[];
  tagline?: string;
  bio?: string;
  rating?: number;
  reviewCount: number;
  feeBdt?: number;
  acceptingNewPatients: boolean;
  offersTele: boolean;
  onboardingStep:
    | 'profile'
    | 'chambers'
    | 'availability'
    | 'preferences'
    | 'team'
    | 'payment'
    | 'done';
  onboardingComplete: boolean;
  subscription: {
    status: 'none' | 'trialing' | 'active' | 'past_due' | 'cancelled';
    planId?: 'starter' | 'pro' | 'clinic';
    cycle?: 'monthly' | 'yearly';
    trialEndsAt?: string;
    renewsAt?: string;
    amountBdt?: number;
    cancelAt?: string;
    lastTranId?: string;
  };
  preferences?: {
    rxLanguage?: 'bn' | 'en' | 'bilingual';
    defaultAppointmentMinutes?: number;
    rxFooter?: string;
  };
}

export function toMeResource(input: {
  user: UserRow;
  doctor: DoctorListRow;
  role: Role;
  isOwner: boolean;
  subscription: SubscriptionRow;
}): MeResource {
  const d = input.doctor;
  const data = d.data ?? {};
  return {
    id: d.id,
    userId: input.user.id,
    teamId: d.team_id,
    role: input.role,
    isOwner: input.isOwner,
    name: d.name,
    nameBn: (data as { name_bn?: string }).name_bn,
    degrees: data.degrees ?? [],
    specialty: d.specialty,
    focusAreas: data.focus_areas ?? [],
    bmdcNo: (d.bmdc_no ?? '') as string,
    phone: (d.phone ?? input.user.data?.phone ?? '') as string,
    email: (d.email ?? input.user.email ?? '') as string,
    avatarUrl: data.avatar_url ?? input.user.data?.avatar_url,
    chambers: (d.chambers ?? []).map((c) => {
      const r = chamberResource.transform(c);
      return {
        id: r.id,
        name: r.name ?? 'Chamber',
        address: r.address ?? '',
        phone: r.phone ?? undefined,
        days: [],
        time: r.timeLabel ?? '',
        lat: r.lat ?? undefined,
        lng: r.lng ?? undefined,
        area: r.area ?? undefined,
      };
    }),
    signatureUrl: (data as { signature_url?: string }).signature_url,
    yearsOfExperience: (data as { years_of_experience?: number }).years_of_experience,
    languages: data.languages,
    tagline: data.tagline ?? undefined,
    bio: data.bio ?? undefined,
    rating: d.rating == null ? undefined : Number(d.rating),
    reviewCount: d.review_count,
    feeBdt: d.fee_bdt ?? undefined,
    acceptingNewPatients: d.status === 'active',
    offersTele: d.offers_tele,
    onboardingStep: d.onboarding_step,
    onboardingComplete: d.onboarding_complete,
    subscription: {
      status: input.subscription.status,
      planId: input.subscription.plan_id ?? undefined,
      cycle: input.subscription.cycle ?? undefined,
      renewsAt: input.subscription.current_period_end?.toISOString(),
      amountBdt: input.subscription.data.amount_bdt,
      lastTranId: input.subscription.data.last_tran_id,
      cancelAt: input.subscription.data.cancel_at,
      trialEndsAt: input.subscription.data.trial_ends_at,
    },
    preferences: (data as { preferences?: MeResource['preferences'] }).preferences,
  };
}
