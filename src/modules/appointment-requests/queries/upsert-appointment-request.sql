-- Params:
--   $1 doctor_id
--   $2 chamber_id  (nullable)
--   $3 phone
--   $4 client_nonce (nullable)
--   $5 data (jsonb)  -- { patient_name, symptoms, preferred_time, mode, source }
INSERT INTO appointment_requests (doctor_id, chamber_id, phone, client_nonce, data)
VALUES ($1, $2, $3, $4, $5::jsonb)
ON CONFLICT (doctor_id, client_nonce) DO UPDATE
  SET data       = appointment_requests.data || EXCLUDED.data,
      updated_at = now()
RETURNING *;
