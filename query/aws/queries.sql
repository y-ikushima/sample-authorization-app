-- name: GetAwsAccount :one
SELECT * FROM aws_account WHERE id = $1;

-- name: GetAwsAccounts :many
SELECT * FROM aws_account;

-- name: GetAwsAccountBySystemId :many
SELECT * FROM aws_account t1 left join aws_account_system_relation t2 on t1.id = t2.aws_account_id where t2.system_id = $1;

-- name: GetAwsAccountUsersByAwsAccountId :many
SELECT * FROM aws_account t1 left join aws_account_user_relation t2 on t1.id = t2.aws_account_id where t2.aws_account_id = $1;

-- name: UpdateAwsAccount :one
UPDATE aws_account SET name = $2, note = $3 WHERE id = $1 RETURNING *;