-- name: GetUser :one
SELECT * FROM user_info WHERE id = $1;

-- name: GetUsers :many
SELECT * FROM user_info;



-- name: CreateUser :one
INSERT INTO user_info (name, email) VALUES ($1, $2) RETURNING *;

-- name: UpdateUser :one
UPDATE user_info SET name = $2, email = $3 WHERE id = $1 RETURNING *;