-- $1 team_id
SELECT
  i.*,
  u.data->>'name' AS invited_by_name
FROM invites i
LEFT JOIN users u ON u.id = i.invited_by
WHERE i.team_id = $1
ORDER BY i.created_at DESC
LIMIT 200;
