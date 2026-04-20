-- Feature flags table + service. In-house, tiny, sufficient. Skip LaunchDarkly.
CREATE TABLE IF NOT EXISTS feature_flags (
  key             text PRIMARY KEY,
  team_id         uuid NULL,
  rolled_out_pct  smallint NOT NULL DEFAULT 0 CHECK (rolled_out_pct BETWEEN 0 AND 100),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS feature_flags_team_id_idx
  ON feature_flags (team_id)
  WHERE team_id IS NOT NULL;
