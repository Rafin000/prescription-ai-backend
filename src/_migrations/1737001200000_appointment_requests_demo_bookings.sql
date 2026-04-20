-- Public landing submissions. No patient account required — phone OTP on the
-- record if/when we confirm. Both tables use `idempotency_key` columns we own
-- to make rapid-double-submit and retry safe.

CREATE TABLE IF NOT EXISTS appointment_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  chamber_id        uuid NULL REFERENCES chambers(id) ON DELETE SET NULL,
  phone             text NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','declined','cancelled','expired')),
  client_nonce      text NULL,           -- owned idempotency key (per submission)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- { patient_name, symptoms, preferred_time, mode (in-person|video),
  --   source (public-search|hero|doctor-card), otp_attempts, notes, … }
  data              jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (doctor_id, client_nonce)
);

CREATE INDEX IF NOT EXISTS appointment_requests_doctor_status_idx
  ON appointment_requests (doctor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS appointment_requests_phone_idx
  ON appointment_requests (phone, created_at DESC);

CREATE TABLE IF NOT EXISTS demo_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  phone             text NULL,
  status            text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','scheduled','completed','cancelled','no_show')),
  client_nonce      text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- { name, practice, specialty, preferred_slot, calendly_event_uri, notes, … }
  data              jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (email, client_nonce)
);

CREATE INDEX IF NOT EXISTS demo_bookings_email_idx
  ON demo_bookings (email, created_at DESC);
CREATE INDEX IF NOT EXISTS demo_bookings_status_idx
  ON demo_bookings (status, created_at DESC);
