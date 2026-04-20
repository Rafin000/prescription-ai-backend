-- v2 of ensure_month_partition: handles the case where the default partition
-- already contains rows that belong in the new range — we detach the default,
-- create the new range partition (rows auto-route), then re-attach default.
-- Wrap in a function + use dynamic SQL so it works across all our partitioned
-- tables uniformly.
CREATE OR REPLACE FUNCTION ensure_month_partition(
  parent_table regclass,
  target_month date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  start_ts   timestamptz := date_trunc('month', target_month)::timestamptz;
  end_ts     timestamptz := (date_trunc('month', target_month) + interval '1 month')::timestamptz;
  short_name text        := split_part(parent_table::text, '.', -1);
  part_name  text        := format('%s_%s', short_name, to_char(start_ts, 'YYYY_MM'));
  default_name text      := format('%s_default', short_name);
  has_default boolean;
  exists_already boolean;
BEGIN
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = %L)',
    part_name
  ) INTO exists_already;
  IF exists_already THEN
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = %L)',
    default_name
  ) INTO has_default;

  -- Postgres forbids creating a new range partition that overlaps with a
  -- default partition already holding rows in that range. Detach the
  -- default, create the new range (rows redistribute), then re-attach.
  IF has_default THEN
    EXECUTE format('ALTER TABLE %s DETACH PARTITION %I', parent_table, default_name);
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_table, start_ts, end_ts
  );

  IF has_default THEN
    EXECUTE format(
      'ALTER TABLE %s ATTACH PARTITION %I DEFAULT', parent_table, default_name
    );
  END IF;
END;
$$;
