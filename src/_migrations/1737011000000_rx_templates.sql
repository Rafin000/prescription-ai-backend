-- Reusable Rx templates a doctor can save + apply to a new consult.
-- doctor_id NULL → shared across the team (admin-published templates).
CREATE TABLE IF NOT EXISTS rx_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  doctor_id    uuid NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text NULL,
  usage_count  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- { chief_complaint, diagnoses[], tests[], advice[], medicines[],
  --   follow_up, notes, tags[] }
  data         jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS rx_templates_team_idx
  ON rx_templates (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rx_templates_doctor_idx
  ON rx_templates (doctor_id) WHERE doctor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rx_templates_name_trgm
  ON rx_templates USING gin (name gin_trgm_ops);
