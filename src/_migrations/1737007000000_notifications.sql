-- Outbound dispatch ledger: one row per SMS / email / web-push / mobile-push
-- attempt. `dedupe_key` is OUR idempotency key (not the vendor's) so retries
-- and duplicate triggers collapse to one row. Partitioned monthly like the
-- other high-throughput tables.

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL,
  -- For in-app rows: the dashboard user who should see it in the bell.
  -- For sms/email: null (recipient is the external handle below).
  user_id     uuid NULL,
  kind        text NOT NULL,       -- 'appointment.confirmed','invoice.paid',…
  channel     text NOT NULL
              CHECK (channel IN ('in-app','sms','email','web-push','mobile-push')),
  recipient   text NOT NULL,       -- phone, email, device token, or user_id
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','sent','failed','bounced','skipped','read')),
  read_at     timestamptz NULL,
  dedupe_key  text NOT NULL,
  ts          timestamptz NOT NULL DEFAULT now(),
  -- { template_vars, provider_response, retry_history, error, subject, body_preview,
  --   title, body, href, severity, actor_id, … }
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, ts),
  UNIQUE (dedupe_key, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS notifications_default
  PARTITION OF notifications DEFAULT;

CREATE INDEX IF NOT EXISTS notifications_team_ts_idx
  ON notifications (team_id, ts DESC);
CREATE INDEX IF NOT EXISTS notifications_kind_ts_idx
  ON notifications (kind, ts DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_ts_idx
  ON notifications (recipient, ts DESC);
-- The bell query: unread, in-app, for a user, newest first.
CREATE INDEX IF NOT EXISTS notifications_inapp_user_idx
  ON notifications (user_id, ts DESC)
  WHERE channel = 'in-app';
