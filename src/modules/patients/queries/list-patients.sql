-- $1 team_id, $2 doctor_id, $3 q (nullable), $4 limit, $5 offset
SELECT
  p.*,
  pii.data AS pii,
  COUNT(*) OVER () AS total_count
FROM patients p
LEFT JOIN patient_pii pii ON pii.patient_id = p.id
WHERE p.team_id = $1
  AND p.doctor_id = $2
  AND p.status = 'active'
  AND (
    $3::text IS NULL
    OR p.code ILIKE '%' || $3::text || '%'
    OR (pii.data->>'name') ILIKE '%' || $3::text || '%'
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(pii.data->'phones', '[]'::jsonb)) AS ph
      WHERE ph ILIKE '%' || $3::text || '%'
    )
  )
ORDER BY p.updated_at DESC
LIMIT $4 OFFSET $5;
