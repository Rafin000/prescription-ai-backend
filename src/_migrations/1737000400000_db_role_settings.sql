-- Role-level GUC so statement_timeout survives PgBouncer transaction-pool
-- mode (where startup params are rejected). Matches `pai` dev role; override
-- per-env in your managed-Postgres console as needed.
ALTER ROLE pai SET statement_timeout = '30s';
ALTER ROLE pai SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE pai SET lock_timeout = '10s';
