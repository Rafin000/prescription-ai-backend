-- Billing + usage ledger. `idempotency_key` columns are ours (not the
-- vendor's) so IPN retries + SMS retries collapse to one row.

CREATE TABLE IF NOT EXISTS invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  period_start      timestamptz NOT NULL,
  period_end        timestamptz NOT NULL,
  amount_bdt        integer NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','cancelled','refunded','upcoming')),
  sslcommerz_tran_id text UNIQUE,            -- owned idempotency key
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- { plan_id, cycle, method, method_hint, line_items[], subscription_bdt,
  --   usage_bdt, receipt_url, pdf_s3_key, gateway_url, session_key, … }
  data              jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS invoices_team_period_idx
  ON invoices (team_id, period_start DESC);
CREATE INDEX IF NOT EXISTS invoices_status_idx
  ON invoices (status, created_at DESC);

-- Monthly-partitioned metering ledger — one row per billable external call.
CREATE TABLE IF NOT EXISTS usage_events (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL,
  consult_id      uuid NULL,
  kind            text NOT NULL
                  CHECK (kind IN ('transcription','ai-fill','talk-to-ai','summary','other')),
  tokens          integer NOT NULL DEFAULT 0,
  cost_bdt        numeric(12,4) NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  ts              timestamptz NOT NULL DEFAULT now(),
  -- { provider, model, request_id, raw_meta, patient_id, patient_name, summary, session_id }
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, ts),
  UNIQUE (idempotency_key, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS usage_events_default
  PARTITION OF usage_events DEFAULT;

CREATE INDEX IF NOT EXISTS usage_events_team_ts_idx
  ON usage_events (team_id, ts DESC);
CREATE INDEX IF NOT EXISTS usage_events_kind_ts_idx
  ON usage_events (kind, ts DESC);

-- Unified cost ledger — rollup target for "is this team about to overrun?"
CREATE TABLE IF NOT EXISTS cost_events (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL,
  category   text NOT NULL CHECK (category IN ('llm','stt','sms','email','storage','other')),
  amount_bdt numeric(12,4) NOT NULL,
  ts         timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS cost_events_default
  PARTITION OF cost_events DEFAULT;

CREATE INDEX IF NOT EXISTS cost_events_team_ts_idx
  ON cost_events (team_id, ts DESC);
