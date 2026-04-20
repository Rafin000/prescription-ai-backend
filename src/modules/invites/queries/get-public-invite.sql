-- $1 token
SELECT
  i.*,
  u.data->>'name' AS invited_by_name,
  t.data->>'name' AS team_name
FROM invites i
LEFT JOIN users u ON u.id = i.invited_by
LEFT JOIN teams t ON t.id = i.team_id
WHERE i.token = $1
LIMIT 1;
