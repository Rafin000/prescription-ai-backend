import { ChamberRowWithDistance } from 'src/modules/chambers/types/chamber.model';

export type OnboardingStep =
  | 'profile'
  | 'chambers'
  | 'availability'
  | 'preferences'
  | 'team'
  | 'payment'
  | 'done';

export interface DoctorRow {
  id: string;
  team_id: string;
  user_id: string | null;
  name: string;
  specialty: string;
  rating: string | number | null; // pg returns numeric as string by default
  review_count: number;
  fee_bdt: number | null;
  offers_tele: boolean;
  status: 'active' | 'paused' | 'archived';
  bmdc_no: string | null;
  phone: string | null;
  email: string | null;
  onboarding_step: OnboardingStep;
  onboarding_complete: boolean;
  created_at: Date;
  updated_at: Date;
  data: DoctorData;
}

export interface DoctorData {
  degrees?: string[];
  focus_areas?: string[];
  tagline?: string;
  bio?: string;
  languages?: string[];
  avatar_url?: string;
  social?: Record<string, string>;
}

export interface DoctorListRow extends DoctorRow {
  chambers: ChamberRowWithDistance[];
  distance_km: number | null;
  total_count: string | number;
}

export interface DoctorResource {
  id: string;
  name: string;
  specialty: string;
  rating: number | null;
  reviewCount: number;
  feeBdt: number | null;
  offersTele: boolean;
  degrees: string[];
  focusAreas: string[];
  tagline: string | null;
  bio: string | null;
  languages: string[];
  avatarUrl: string | null;
  chambers: Array<{
    id: string;
    doctorId: string;
    name: string | null;
    address: string | null;
    phone: string | null;
    area: string | null;
    timeLabel: string | null;
    status: 'active' | 'paused' | 'archived';
    lat: number | null;
    lng: number | null;
    distanceKm: number | null;
  }>;
  distanceKm: number | null;
}
