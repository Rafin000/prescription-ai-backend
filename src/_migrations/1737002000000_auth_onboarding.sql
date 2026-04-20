-- Extend users with password auth state.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text NULL,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL;

-- Onboarding + identity columns on doctors.
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS bmdc_no text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS email text NULL,
  ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'profile'
    CHECK (onboarding_step IN
           ('profile','chambers','availability','preferences','team','payment','done')),
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_bmdc_no_uk
  ON doctors (bmdc_no) WHERE bmdc_no IS NOT NULL;

-- Stored step payload snapshots so the UI can resume mid-flow.
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  doctor_id    uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  step         text NOT NULL
               CHECK (step IN ('profile','chambers','availability','preferences','team','payment')),
  completed_at timestamptz NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (doctor_id, step)
);

-- Stub subscription: one row per team. Real SSLCommerz rows land in slice 6.
CREATE TABLE IF NOT EXISTS subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          uuid NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  plan_id          text NULL,                     -- 'starter' | 'pro' | 'clinic'
  cycle            text NULL,                     -- 'monthly' | 'yearly'
  status           text NOT NULL DEFAULT 'none'
                   CHECK (status IN ('none','trialing','active','past_due','cancelled')),
  current_period_end timestamptz NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  data             jsonb NOT NULL DEFAULT '{}'::jsonb
);
