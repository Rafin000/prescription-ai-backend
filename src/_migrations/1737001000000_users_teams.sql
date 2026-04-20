-- Identity + tenancy skeleton. Auth-specific columns (password_hash, magic
-- link state, etc.) come in the auth slice; this migration just establishes
-- the FK targets the directory tables need.

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NULL,       -- nullable: manually-added (non-signed-up) doctors have no user
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- { name, phone, avatar_url, locale, … }
  data       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan       text NOT NULL DEFAULT 'starter',
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- { name, billing_email, address, logo_url, … }
  data       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner','doctor','assistant','receptionist')),
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members (user_id);
CREATE INDEX IF NOT EXISTS team_members_team_idx ON team_members (team_id);
