-- name: GetSystem :one
SELECT * FROM system WHERE id = $1;

-- name: GetSystems :many
SELECT * FROM system;

-- name: GetSystemAccounts :many
SELECT t1.id, t1.name, t1.note, t2.id, t2.system_id, t2.user_id 
FROM system t1 
LEFT JOIN system_user_relation t2 ON t1.id = t2.system_id 
WHERE t1.id = $1;

-- name: UpdateSystem :one
UPDATE system 
SET name = $2, note = $3 
WHERE id = $1 
RETURNING id, name, note;
