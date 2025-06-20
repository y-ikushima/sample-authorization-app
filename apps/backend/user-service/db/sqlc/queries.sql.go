// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0
// source: queries.sql

package sqlc

import (
	"context"
)

const createUser = `-- name: CreateUser :one
INSERT INTO user_info (name, email) VALUES ($1, $2) RETURNING id, name, email
`

type CreateUserParams struct {
	Name  string
	Email string
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (UserInfo, error) {
	row := q.db.QueryRow(ctx, createUser, arg.Name, arg.Email)
	var i UserInfo
	err := row.Scan(&i.ID, &i.Name, &i.Email)
	return i, err
}

const getUser = `-- name: GetUser :one
SELECT id, name, email FROM user_info WHERE id = $1
`

func (q *Queries) GetUser(ctx context.Context, id string) (UserInfo, error) {
	row := q.db.QueryRow(ctx, getUser, id)
	var i UserInfo
	err := row.Scan(&i.ID, &i.Name, &i.Email)
	return i, err
}

const getUsers = `-- name: GetUsers :many
SELECT id, name, email FROM user_info
`

func (q *Queries) GetUsers(ctx context.Context) ([]UserInfo, error) {
	rows, err := q.db.Query(ctx, getUsers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UserInfo
	for rows.Next() {
		var i UserInfo
		if err := rows.Scan(&i.ID, &i.Name, &i.Email); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getUsersByIDs = `-- name: GetUsersByIDs :many
SELECT id, name, email FROM user_info WHERE id = ANY($1::text[])
`

func (q *Queries) GetUsersByIDs(ctx context.Context, dollar_1 []string) ([]UserInfo, error) {
	rows, err := q.db.Query(ctx, getUsersByIDs, dollar_1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UserInfo
	for rows.Next() {
		var i UserInfo
		if err := rows.Scan(&i.ID, &i.Name, &i.Email); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateUser = `-- name: UpdateUser :one
UPDATE user_info SET name = $2, email = $3 WHERE id = $1 RETURNING id, name, email
`

type UpdateUserParams struct {
	ID    string
	Name  string
	Email string
}

func (q *Queries) UpdateUser(ctx context.Context, arg UpdateUserParams) (UserInfo, error) {
	row := q.db.QueryRow(ctx, updateUser, arg.ID, arg.Name, arg.Email)
	var i UserInfo
	err := row.Scan(&i.ID, &i.Name, &i.Email)
	return i, err
}
