-- Params: $1 email  $2 phone  $3 client_nonce  $4 data(jsonb)  $5 status
INSERT INTO demo_bookings (email, phone, client_nonce, data, status)
VALUES ($1, $2, $3, $4::jsonb, $5::text)
ON CONFLICT (email, client_nonce) DO UPDATE
  SET data       = demo_bookings.data || EXCLUDED.data,
      phone      = COALESCE(EXCLUDED.phone, demo_bookings.phone),
      status     = EXCLUDED.status,
      updated_at = now()
RETURNING *;
