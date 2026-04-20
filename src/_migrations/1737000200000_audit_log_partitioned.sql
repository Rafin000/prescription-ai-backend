-- Append-only audit log, partitioned monthly. Hash-chained (prev_hash) for
-- tamper-evidence. Retention: keep >= 7 years per regulatory caution.
CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL,
  actor_user_id   uuid NULL,
  resource_type   text NOT NULL,
  resource_id     text NOT NULL,
  action          text NOT NULL,
  ip              inet NULL,
  ts              timestamptz NOT NULL DEFAULT now(),
  prev_hash       text NULL,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- Default "catch-all" partition so inserts never fail if the monthly cron lags.
-- The retention/partition worker converts these into proper month partitions.
CREATE TABLE IF NOT EXISTS audit_log_default
  PARTITION OF audit_log DEFAULT;

CREATE INDEX IF NOT EXISTS audit_log_team_ts_idx
  ON audit_log (team_id, ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx
  ON audit_log (resource_type, resource_id);
