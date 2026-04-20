-- Params (one SQL, optional near-me sort):
--   $1  q          text | null   free-text (name/specialty/area, trigram)
--   $2  specialty  text | null   filter (prefix/trigram match)
--   $3  area       text | null   filter (on chambers.area)
--   $4  near_lat   float8 | null
--   $5  near_lng   float8 | null
--   $6  tele_only  bool
--   $7  limit      int
--   $8  offset     int
WITH
  -- Active chambers (optionally filtered by area), with computed distance.
  matched_chambers AS (
    SELECT
      c.id,
      c.doctor_id,
      c.team_id,
      c.lat,
      c.lng,
      c.area,
      c.status,
      c.created_at,
      c.updated_at,
      c.data,
      CASE
        WHEN $4::float8 IS NOT NULL
         AND $5::float8 IS NOT NULL
         AND c.lat IS NOT NULL
         AND c.lng IS NOT NULL
        THEN 6371.0 * acos(
          greatest(-1.0, least(1.0,
            cos(radians($4::float8)) * cos(radians(c.lat)) *
            cos(radians(c.lng) - radians($5::float8)) +
            sin(radians($4::float8)) * sin(radians(c.lat))
          ))
        )
        ELSE NULL
      END AS distance_km
    FROM chambers c
    WHERE c.status = 'active'
      AND ($3::text IS NULL OR c.area ILIKE '%' || $3::text || '%')
  ),
  -- Collapse chambers per doctor + pick the nearest distance for sorting.
  per_doctor AS (
    SELECT
      mc.doctor_id,
      jsonb_agg(
        to_jsonb(mc) - 'doctor_id'
        ORDER BY COALESCE(mc.distance_km, 1e9), mc.created_at
      ) AS chambers,
      MIN(mc.distance_km) AS nearest_km
    FROM matched_chambers mc
    GROUP BY mc.doctor_id
  )
SELECT
  d.id,
  d.team_id,
  d.user_id,
  d.name,
  d.specialty,
  d.rating,
  d.review_count,
  d.fee_bdt,
  d.offers_tele,
  d.status,
  d.created_at,
  d.updated_at,
  d.data,
  COALESCE(pd.chambers, '[]'::jsonb) AS chambers,
  pd.nearest_km AS distance_km,
  COUNT(*) OVER () AS total_count
FROM doctors d
LEFT JOIN per_doctor pd ON pd.doctor_id = d.id
WHERE d.status = 'active'
  -- When `area` is specified, require at least one chamber matched it.
  AND ($3::text IS NULL OR pd.chambers IS NOT NULL)
  -- Free-text: match name OR specialty (trigram), or any chamber area.
  AND (
    $1::text IS NULL
    OR d.name ILIKE '%' || $1::text || '%'
    OR d.specialty ILIKE '%' || $1::text || '%'
    OR EXISTS (
      SELECT 1 FROM matched_chambers mc2
      WHERE mc2.doctor_id = d.id AND mc2.area ILIKE '%' || $1::text || '%'
    )
  )
  AND ($2::text IS NULL OR d.specialty ILIKE '%' || $2::text || '%')
  AND ($6::bool IS FALSE OR d.offers_tele = true)
ORDER BY
  -- Near-me sort first when coords supplied.
  CASE WHEN pd.nearest_km IS NOT NULL THEN pd.nearest_km END ASC NULLS LAST,
  d.rating DESC NULLS LAST,
  d.review_count DESC,
  d.created_at DESC
LIMIT $7::int OFFSET $8::int;
