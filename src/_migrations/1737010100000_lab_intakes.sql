-- Lab report uploads + AI routing queue. Promote status + uploaded_at so the
-- inbox can filter + sort cheaply; everything else in `data` jsonb.
CREATE TABLE IF NOT EXISTS lab_intakes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  uploaded_by   uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  patient_id    uuid NULL REFERENCES patients(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing','routed','needs_review','unidentified','archived')),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- { filename, mime, size_kb, pages, preview_url, s3_key, note,
  --   extracted: {...}, suggestion: {...}, routed: {...},
  --   hints: {patient_id, test_id, note} }
  data          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lab_intakes_team_status_idx
  ON lab_intakes (team_id, status, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS lab_intakes_patient_idx
  ON lab_intakes (patient_id) WHERE patient_id IS NOT NULL;
