package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"system-service/db/sqlc"

	"github.com/jackc/pgx/v5/pgxpool"
)

// 環境変数のデフォルト値
const (
	defaultUserServiceURL = "http://user-service:3003"
)

var (
	userServiceURL string
)

func init() {
	// 環境変数からUser Service URLを取得
	userServiceURL = os.Getenv("USER_SERVICE_URL")
	if userServiceURL == "" {
		userServiceURL = defaultUserServiceURL
	}
}

func main() {
	// データベース接続を設定
	config, err := pgxpool.ParseConfig(getDBURL())
	if err != nil {
		log.Fatalf("プール設定の解析に失敗しました: %v", err)
	}

	// 接続プールの初期化
	conn, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("データベースに接続できません: %v", err)
	}
	defer conn.Close()

	queries := sqlc.New(conn) // 生成されたクエリインターフェースを初期化
	fmt.Println("データベースに正常に接続しました")

	// ルーティング設定
	r := setupRouter(queries)

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}

func getDBURL() string {
	host := os.Getenv("SYSTEM_SERVICE_POSTGRES_HOST")
	port := os.Getenv("SYSTEM_SERVICE_POSTGRES_PORT")
	user := os.Getenv("SYSTEM_SERVICE_POSTGRES_USER")
	password := os.Getenv("SYSTEM_SERVICE_POSTGRES_PASSWORD")
	dbname := os.Getenv("SYSTEM_SERVICE_POSTGRES_DB")

	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s", user, password, host, port, dbname)
}