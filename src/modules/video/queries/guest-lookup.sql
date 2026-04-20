-- $1 join_token
SELECT
  a.id                                        AS appointment_id,
  a.start_at,
  a.end_at,
  a.type,
  a.status,
  a.data,
  d.name                                      AS doctor_name,
  d.specialty                                 AS doctor_specialty,
  d.data->>'avatar_url'                       AS doctor_avatar_url,
  d.data->>'name_bn'                          AS doctor_name_bn,
  c.data->>'name'                             AS chamber_name,
  COALESCE(pii.data->>'name', a.data->>'patient_name_cache') AS patient_name
FROM appointments a
LEFT JOIN doctors  d  ON d.id = a.doctor_id
LEFT JOIN chambers c  ON c.id = a.chamber_id
LEFT JOIN patient_pii pii ON pii.patient_id = a.patient_id
WHERE a.type = 'tele' AND a.data->>'join_token' = $1
LIMIT 1;
