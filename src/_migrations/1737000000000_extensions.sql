-- Required Postgres extensions. All present in standard managed Postgres 16.
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- typo-tolerant text search
CREATE EXTENSION IF NOT EXISTS unaccent;       -- accent-insensitive matching
CREATE EXTENSION IF NOT EXISTS btree_gin;      -- composite gin indexes
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
