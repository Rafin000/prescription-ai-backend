-- $1 team_id, $2 id
SELECT
  p.*,
  pii.data AS pii
FROM patients p
LEFT JOIN patient_pii pii ON pii.patient_id = p.id
WHERE p.team_id = $1 AND p.id = $2
LIMIT 1;
