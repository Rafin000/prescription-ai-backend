-- Patients split into a non-PII table + an encrypted-PII table so the
-- "right to be forgotten" is a single DELETE on patient_pii. JSONB for
-- everything not queried.

CREATE TABLE IF NOT EXISTS patients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  code            text NOT NULL,              -- per-team display id "PAT-XXXX"
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','archived','merged')),
  patient_since   timestamptz NOT NULL DEFAULT now(),
  anonymised_at   timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- { age, sex, blood_group, allergies[], conditions[], notes,
  --   avatar_url, surgical_plan, emergency_contact, … }
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (team_id, code)
);

CREATE INDEX IF NOT EXISTS patients_team_status_idx
  ON patients (team_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS patients_doctor_idx
  ON patients (doctor_id, status);

-- PII lives in a second table. Today it's plaintext jsonb; encryption at
-- rest will wrap it in slice 10. Anonymisation = one DELETE.
CREATE TABLE IF NOT EXISTS patient_pii (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  -- { name, name_bn, phones[], addresses[], id_no, emergency_contact, … }
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_pii_team_idx ON patient_pii (team_id);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  chamber_id      uuid NULL REFERENCES chambers(id) ON DELETE SET NULL,
  -- Nullable when the appointment was booked for a draft patient that
  -- hasn't been promoted to a real Patient record yet.
  patient_id      uuid NULL REFERENCES patients(id) ON DELETE SET NULL,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  type            text NOT NULL
                  CHECK (type IN ('in-person','tele','surgery','follow-up')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','cancelled','noshow','done')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- { note, reason, procedure, hospital, patient_draft, surgical_plan_id,
  --   join_token, presence:{doctor,patient}, duration_min, … }
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS appointments_team_start_idx
  ON appointments (team_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_doctor_start_idx
  ON appointments (doctor_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_patient_idx
  ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx
  ON appointments (status, start_at);
