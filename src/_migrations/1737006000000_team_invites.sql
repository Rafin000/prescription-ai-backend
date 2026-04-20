-- Rename "owner" to "admin" to match dashboard's TeamRole vocabulary, then
-- relax the check to accept custom roles. Custom role catalogue comes in the
-- roles module later — for now, any string is allowed.
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

UPDATE team_members SET role = 'admin' WHERE role = 'owner';

-- Invites — magic-link tokens for inviting team members.
CREATE TABLE IF NOT EXISTS invites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email          text NOT NULL,
  role           text NOT NULL,
  token          text NOT NULL UNIQUE,     -- owned capability, URL-safe base64
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by     uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at     timestamptz NOT NULL,
  accepted_at    timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- { message, resent_at, accepted_user_id, … }
  data           jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS invites_team_status_idx
  ON invites (team_id, status, created_at DESC);
-- A team can only have one pending invite per email at a time.
CREATE UNIQUE INDEX IF NOT EXISTS invites_team_email_pending_uk
  ON invites (team_id, lower(email))
  WHERE status = 'pending';
