-- Signed-up doctors + their physical chambers. JSONB rule: promote only
-- fields that are queried, indexed, FK'd, always-read, or tenancy scope.
-- Everything else (degrees, focus_areas, tagline, languages, avatar_url, bio,
-- social, hours, photos, …) lives in `data jsonb`.

CREATE TABLE IF NOT EXISTS doctors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  -- Nullable: manually-added (non-signed-up) doctors merged in later when they sign up.
  user_id         uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  name            text NOT NULL,                        -- always rendered + searched
  specialty       text NOT NULL,                        -- filtered, searched, indexed
  rating          numeric(3,2) NULL,                    -- sorted
  review_count    integer NOT NULL DEFAULT 0,
  fee_bdt         integer NULL,                         -- filtered by range
  offers_tele     boolean NOT NULL DEFAULT false,       -- filtered
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS doctors_team_status_idx
  ON doctors (team_id, status);
CREATE INDEX IF NOT EXISTS doctors_specialty_idx
  ON doctors (specialty) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS doctors_name_trgm_idx
  ON doctors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS doctors_specialty_trgm_idx
  ON doctors USING gin (specialty gin_trgm_ops);
CREATE INDEX IF NOT EXISTS doctors_rating_idx
  ON doctors (rating DESC NULLS LAST) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS chambers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  lat             double precision NULL,   -- queried (distance sort)
  lng             double precision NULL,
  area            text NULL,               -- filtered + searched
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- { name, address, phone, hours, time_label, photos, amenities, … }
  data            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS chambers_doctor_idx
  ON chambers (doctor_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS chambers_team_idx
  ON chambers (team_id);
CREATE INDEX IF NOT EXISTS chambers_area_trgm_idx
  ON chambers USING gin (area gin_trgm_ops) WHERE area IS NOT NULL;
-- Cheap bbox pre-filter for distance queries.
CREATE INDEX IF NOT EXISTS chambers_latlng_idx
  ON chambers (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
