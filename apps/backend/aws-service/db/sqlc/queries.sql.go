// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.29.0
// source: queries.sql

package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const getAwsAccount = `-- name: GetAwsAccount :one
SELECT id, name, note FROM aws_account WHERE id = $1
`

func (q *Queries) GetAwsAccount(ctx context.Context, id string) (AwsAccount, error) {
	row := q.db.QueryRow(ctx, getAwsAccount, id)
	var i AwsAccount
	err := row.Scan(&i.ID, &i.Name, &i.Note)
	return i, err
}

const getAwsAccountBySystemId = `-- name: GetAwsAccountBySystemId :many
SELECT t1.id, name, note, t2.id, aws_account_id, system_id FROM aws_account t1 left join aws_account_system_relation t2 on t1.id = t2.aws_account_id where t2.system_id = $1
`

type GetAwsAccountBySystemIdRow struct {
	ID           string
	Name         string
	Note         string
	ID_2         pgtype.Text
	AwsAccountID pgtype.Text
	SystemID     pgtype.Text
}

func (q *Queries) GetAwsAccountBySystemId(ctx context.Context, systemID string) ([]GetAwsAccountBySystemIdRow, error) {
	rows, err := q.db.Query(ctx, getAwsAccountBySystemId, systemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAwsAccountBySystemIdRow
	for rows.Next() {
		var i GetAwsAccountBySystemIdRow
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Note,
			&i.ID_2,
			&i.AwsAccountID,
			&i.SystemID,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAwsAccountUsersByAwsAccountId = `-- name: GetAwsAccountUsersByAwsAccountId :many
SELECT t1.id, name, note, t2.id, aws_account_id, user_id FROM aws_account t1 left join aws_account_user_relation t2 on t1.id = t2.aws_account_id where t2.aws_account_id = $1
`

type GetAwsAccountUsersByAwsAccountIdRow struct {
	ID           string
	Name         string
	Note         string
	ID_2         pgtype.Text
	AwsAccountID pgtype.Text
	UserID       pgtype.Text
}

func (q *Queries) GetAwsAccountUsersByAwsAccountId(ctx context.Context, awsAccountID string) ([]GetAwsAccountUsersByAwsAccountIdRow, error) {
	rows, err := q.db.Query(ctx, getAwsAccountUsersByAwsAccountId, awsAccountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAwsAccountUsersByAwsAccountIdRow
	for rows.Next() {
		var i GetAwsAccountUsersByAwsAccountIdRow
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Note,
			&i.ID_2,
			&i.AwsAccountID,
			&i.UserID,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAwsAccounts = `-- name: GetAwsAccounts :many
SELECT id, name, note FROM aws_account
`

func (q *Queries) GetAwsAccounts(ctx context.Context) ([]AwsAccount, error) {
	rows, err := q.db.Query(ctx, getAwsAccounts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AwsAccount
	for rows.Next() {
		var i AwsAccount
		if err := rows.Scan(&i.ID, &i.Name, &i.Note); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateAwsAccount = `-- name: UpdateAwsAccount :one
UPDATE aws_account SET name = $2, note = $3 WHERE id = $1 RETURNING id, name, note
`

type UpdateAwsAccountParams struct {
	ID   string
	Name string
	Note string
}

func (q *Queries) UpdateAwsAccount(ctx context.Context, arg UpdateAwsAccountParams) (AwsAccount, error) {
	row := q.db.QueryRow(ctx, updateAwsAccount, arg.ID, arg.Name, arg.Note)
	var i AwsAccount
	err := row.Scan(&i.ID, &i.Name, &i.Note)
	return i, err
}
