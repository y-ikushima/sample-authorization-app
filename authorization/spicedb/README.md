# SpiceDB Authorization Server（公式イメージ版）

統一認可システムの SpiceDB 実装サーバーです。公式の`authzed/spicedb`イメージを使用して Zed スキーマファイルから権限管理を行います。

## 機能

- 🚀 **公式 SpiceDB イメージ使用**: 本格的な SpiceDB 機能をフル活用
- 📋 **Zed スキーマファイル対応**: `schema.zed`からの権限定義読み込み
- 🗄️ **PostgreSQL 統合**: データベースでの永続化（テーブル自動作成）
- 🌐 **HTTP + gRPC API**: RESTful HTTP API と gRPC の両方に対応
- ⚡ **自動初期化**: スキーマとリレーションシップの自動セットアップ
- 📊 **YAML データ移行**: 既存の YAML 設定からのデータ投入

## API エンドポイント

### HTTP API（ポート 8082）

- **認可チェック**: `POST /v1/permissions/check`
- **リレーションシップ管理**: `POST /v1/relationships/write`
- **スキーマ管理**: `POST /v1/schema/write`
- **ヘルスチェック**: `GET /healthz`

### gRPC API（ポート 50051）

- SpiceDB 公式プロトコルバッファ API をフルサポート

## 使用方法

### Docker Compose（推奨）

```bash
# サービス起動
docker-compose up spicedb-server

# ログ確認
docker-compose logs -f spicedb-server
```

### HTTP API での認可チェック例

```bash
curl -X POST http://localhost:8082/v1/permissions/check \
  -H "Authorization: Bearer spicedb-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "resource": {
      "object_type": "system",
      "object_id": "system1"
    },
    "permission": "read",
    "subject": {
      "object": {
        "object_type": "user",
        "object_id": "taro"
      }
    }
  }'
```

### zed コマンドラインツールでの操作

```bash
# コンテナ内でzedコマンドを実行
docker exec -it spicedb-server zed --endpoint="localhost:50051" --token="spicedb-secret-key" --insecure relationship list

# 新しいリレーションシップの作成
docker exec -it spicedb-server zed --endpoint="localhost:50051" --token="spicedb-secret-key" --insecure \
  relationship create system:system1 owner user:taro
```

## 環境変数

| 変数名                       | デフォルト値          | 説明                 |
| ---------------------------- | --------------------- | -------------------- |
| `SPICEDB_GRPC_PRESHARED_KEY` | `spicedb-secret-key`  | 認証トークン         |
| `SPICEDB_DATASTORE_ENGINE`   | `postgres`            | データストアエンジン |
| `SPICEDB_DATASTORE_CONN_URI` | PostgreSQL 接続文字列 | データベース接続情報 |

## ファイル構成

- `schema.zed` - SpiceDB スキーマ定義（Zed 言語）
- `relationships.yaml` - 初期リレーションシップデータ
- `init-spicedb.sh` - 初期化スクリプト
- `Dockerfile.dev` - 開発用 Docker ファイル

## 初期化プロセス

1. **SpiceDB サーバー起動** - PostgreSQL に接続してテーブル自動作成
2. **zed ツールインストール** - スキーマ管理用 CLI ツール準備
3. **スキーマ書き込み** - `schema.zed`を SpiceDB に適用
4. **リレーションシップ投入** - `relationships.yaml`からデータ読み込み
5. **サーバー稼働** - HTTP/gRPC API サービス開始

## トラブルシューティング

### 初期化が失敗する場合

```bash
# コンテナログを確認
docker-compose logs spicedb-server

# データベース接続確認
docker exec -it spicedb_postgres psql -U spicedb -d spicedb -c "\dt"
```

### 手動でのリレーションシップ確認

```bash
# SpiceDB内のリレーションシップ一覧
docker exec -it spicedb-server zed --endpoint="localhost:50051" --token="spicedb-secret-key" --insecure \
  relationship list
```

## 公式ドキュメント

- [SpiceDB 公式ドキュメント](https://authzed.com/docs)
- [Zed CLI リファレンス](https://authzed.com/docs/spicedb/installing-zed)
- [HTTP API リファレンス](https://authzed.com/docs/reference/api)

## メリット

✅ **完全な SpiceDB 機能**: 公式実装による全機能利用  
✅ **自動テーブル管理**: データベーススキーマの自動作成・管理  
✅ **最適化済み**: プロダクション対応の最適化されたパフォーマンス  
✅ **標準準拠**: Google Zanzibar 仕様に完全準拠  
✅ **豊富な API**: HTTP + gRPC での柔軟な統合
