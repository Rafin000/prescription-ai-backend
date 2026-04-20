-- A consult is the session record — one per in-person consultation or
-- video call. The structured Rx lives in `prescriptions` and is linked by
-- consult_id. Both append-write tables; promote minimal columns, everything
-- else in `data jsonb`.

CREATE TABLE IF NOT EXISTS consults (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id  uuid NULL REFERENCES appointments(id) ON DELETE SET NULL,
  chamber_id      uuid NULL REFERENCES chambers(id) ON DELETE SET NULL,
  type            text NOT NULL
                  CHECK (type IN ('consultation','follow-up','tele')),
  status          text NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('ongoing','completed','discarded')),
  rx_status       text NOT NULL DEFAULT 'none'
                  CHECK (rx_status IN ('none','draft','final')),
  printed         boolean NOT NULL DEFAULT false,
  duration_sec    integer NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL,
  ended_at        timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS consults_team_started_idx
  ON consults (team_id, started_at DESC);
CREATE INDEX IF NOT EXISTS consults_doctor_started_idx
  ON consults (doctor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS consults_patient_started_idx
  ON consults (patient_id, started_at DESC);
CREATE INDEX IF NOT EXISTS consults_status_idx
  ON consults (status, rx_status);

CREATE TABLE IF NOT EXISTS prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  consult_id      uuid NULL REFERENCES consults(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','final','cancelled')),
  finalised_at    timestamptz NULL,
  printed_at      timestamptz NULL,
  model_id        text NULL,           -- LLM provenance for bisect on regressions
  prompt_version  text NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- { chief_complaint, diagnoses[], tests[], advice[], medicines[],
  --   follow_up, notes, operation, vitals, ... }
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS prescriptions_team_created_idx
  ON prescriptions (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prescriptions_patient_idx
  ON prescriptions (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prescriptions_consult_idx
  ON prescriptions (consult_id) WHERE consult_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prescriptions_status_idx
  ON prescriptions (status, finalised_at DESC NULLS LAST);
