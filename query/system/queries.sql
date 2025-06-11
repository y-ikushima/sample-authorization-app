-- name: GetSystem :one
SELECT * FROM system WHERE id = $1;

-- name: GetSystems :many
SELECT * FROM system;

-- name: GetSystemAccounts :many
SELECT * FROM system t1 left join system_user_relation t2 on t1.id = t2.system_id where t2.system_id = $1;
