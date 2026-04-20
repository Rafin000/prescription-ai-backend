-- $1 team_id, $2 patient_id
SELECT
  c.*,
  p.id   AS prescription_id,
  p.data AS prescription_data,
  pii.data->>'name' AS patient_name
FROM consults c
LEFT JOIN LATERAL (
  SELECT id, data
    FROM prescriptions
   WHERE consult_id = c.id
   ORDER BY created_at DESC
   LIMIT 1
) p ON true
LEFT JOIN patient_pii pii ON pii.patient_id = c.patient_id
WHERE c.team_id    = $1
  AND c.patient_id = $2
ORDER BY c.started_at DESC
LIMIT 100;
