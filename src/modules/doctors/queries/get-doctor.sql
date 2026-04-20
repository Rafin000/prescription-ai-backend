-- $1 id
SELECT
  d.id, d.team_id, d.user_id, d.name, d.specialty, d.rating, d.review_count,
  d.fee_bdt, d.offers_tele, d.status, d.created_at, d.updated_at, d.data,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'team_id', c.team_id,
          'doctor_id', c.doctor_id,
          'lat', c.lat, 'lng', c.lng,
          'area', c.area, 'status', c.status,
          'created_at', c.created_at, 'updated_at', c.updated_at,
          'data', c.data,
          'distance_km', NULL
        )
        ORDER BY c.created_at
      )
      FROM chambers c
      WHERE c.doctor_id = d.id AND c.status = 'active'
    ),
    '[]'::jsonb
  ) AS chambers,
  NULL::float8 AS distance_km,
  1::bigint AS total_count
FROM doctors d
WHERE d.id = $1 AND d.status = 'active';
