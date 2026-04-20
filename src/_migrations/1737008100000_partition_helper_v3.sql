-- v3: when we detach default to create a new range partition, rows that
-- belong in the new range are still sitting in the (detached) default.
-- Re-inserting via the parent re-routes them, then truncate the default
-- before re-attaching.
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
  overlap_count bigint;
BEGIN
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = %L)',
    part_name
  ) INTO exists_already;
  IF exists_already THEN RETURN; END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = %L)',
    default_name
  ) INTO has_default;

  IF has_default THEN
    EXECUTE format('ALTER TABLE %s DETACH PARTITION %I', parent_table, default_name);
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_table, start_ts, end_ts
  );

  IF has_default THEN
    -- Move any rows that fall in the new range back through the parent so
    -- they route correctly. Then truncate + re-attach the (now empty over
    -- this range) default.
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE ts >= %L AND ts < %L',
      default_name, start_ts, end_ts
    ) INTO overlap_count;

    IF overlap_count > 0 THEN
      EXECUTE format(
        'INSERT INTO %s SELECT * FROM %I WHERE ts >= %L AND ts < %L',
        parent_table, default_name, start_ts, end_ts
      );
      EXECUTE format(
        'DELETE FROM %I WHERE ts >= %L AND ts < %L',
        default_name, start_ts, end_ts
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE %s ATTACH PARTITION %I DEFAULT',
      parent_table, default_name
    );
  END IF;
END;
$$;
