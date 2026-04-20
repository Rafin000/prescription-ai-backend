-- $1 team_id, $2 doctor_id, $3 from (nullable), $4 to (nullable)
SELECT
  a.*,
  COALESCE(pii.data->>'name', a.data->>'patient_name_cache') AS patient_name
FROM appointments a
LEFT JOIN patient_pii pii ON pii.patient_id = a.patient_id
WHERE a.team_id = $1
  AND a.doctor_id = $2
  AND ($3::timestamptz IS NULL OR a.start_at >= $3)
  AND ($4::timestamptz IS NULL OR a.start_at <  $4)
ORDER BY a.start_at ASC;
