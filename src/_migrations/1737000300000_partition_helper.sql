-- Helper function: idempotently create a monthly partition for a partitioned
-- table whose partition key is a timestamptz column. Called by the
-- `partition:ensure` BullMQ cron on the 25th of each month for the next month.
CREATE OR REPLACE FUNCTION ensure_month_partition(
  parent_table regclass,
  target_month date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  start_ts   timestamptz := date_trunc('month', target_month)::timestamptz;
  end_ts     timestamptz := (date_trunc('month', target_month) + interval '1 month')::timestamptz;
  part_name  text        := format('%s_%s',
                                   split_part(parent_table::text, '.', -1),
                                   to_char(start_ts, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_table, start_ts, end_ts
  );
END;
$$;
