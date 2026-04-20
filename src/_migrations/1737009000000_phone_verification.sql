-- Phone verification columns on users. nullable `phone` already lives in
-- users.data; we promote `phone_verified` so it's cheap to query and enforce.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS users_phone_verified_idx
  ON users (phone_verified) WHERE phone_verified = true;
