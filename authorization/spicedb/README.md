# SpiceDB Authorization Server

Casbin と同等の階層型認可システムを SpiceDB で実装したサーバーです。

## 機能

- **階層権限**: Admin > Owner > Manager > Staff の 4 段階権限
- **リソース管理**: システム、AWS アカウント、ユーザー管理、API エンドポイント
- **動的権限管理**: リレーションシップの追加・削除が可能

## 権限レベル

### Admin (taro)

- 全操作が可能
- システム、AWS アカウント、ユーザー管理の全権限

### Owner (jiro)

- システム配下なら全操作可能
- 自分が管理するシステムと AWS アカウントの全権限

### Manager (saburo)

- システムと AWS アカウントの編集可能
- ユーザー管理は閲覧のみ

### Staff (hanako)

- 全リソースの閲覧のみ

## API エンドポイント

### 認可チェック

```bash
POST /authorize
{
  "subject": "taro",
  "resource": "system:system1",
  "permission": "read"
}
```

### リレーションシップ管理

```bash
# リレーションシップ取得
GET /relationships?resource_type=system

# リレーションシップ追加
POST /relationships
{
  "resource": "system:system1",
  "relation": "owner",
  "subject": "user:jiro"
}

# リレーションシップ削除
DELETE /relationships
{
  "resource": "system:system1",
  "relation": "owner",
  "subject": "user:jiro"
}
```

### ヘルスチェック

```bash
GET /health
```

## セットアップ

### 前提条件

- SpiceDB サーバーが `localhost:50051` で稼働している必要があります

### Docker 実行

```bash
# SpiceDBサーバーの起動（別途必要）
docker run --rm -p 50051:50051 \
  authzed/spicedb serve \
  --grpc-preshared-key "dev-token" \
  --http-enabled

# アプリケーションのビルドと実行
docker build -f Dockerfile.dev -t spicedb-auth .
docker run -p 8081:8081 \
  -e SPICEDB_ENDPOINT=host.docker.internal:50051 \
  -e SPICEDB_TOKEN=dev-token \
  spicedb-auth
```

### ローカル実行

```bash
# SpiceDBサーバーが起動していることを確認
export SPICEDB_ENDPOINT=localhost:50051
export SPICEDB_TOKEN=dev-token
go run main.go
```

## スキーマ更新

スキーマを変更した場合は、SpiceDB サーバーに適用する必要があります：

```bash
# SpiceDBコマンドラインツールを使用
zed schema write schema.zed --endpoint localhost:50051 --token dev-token
```

## 設定ファイル

- `schema.zed`: SpiceDB のスキーマ定義
- `relationships.yaml`: 初期リレーションシップデータ
- `go.mod`: Go 依存関係管理
