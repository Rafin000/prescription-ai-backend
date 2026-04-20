-- $1 team_id
SELECT
  tm.*,
  u.email                          AS email,
  u.data->>'name'                  AS name,
  u.data->>'phone'                 AS phone,
  u.data->>'avatar_url'            AS avatar_url,
  (tm.role = 'admin')              AS is_owner
FROM team_members tm
LEFT JOIN users u ON u.id = tm.user_id
WHERE tm.team_id = $1 AND tm.status != 'disabled'
ORDER BY CASE WHEN tm.role = 'admin' THEN 0 ELSE 1 END, tm.created_at;
