# SpiceDB Authorization Service

SpiceDB を使用した認可サービス。

## フォルダ構成

```
authorization/spicedb/
├── Dockerfile.dev      # SpiceDBサーバー（シンプル構成）
├── schema.zed          # SpiceDBスキーマ定義
├── relationships.yaml  # スキーマ + リレーション（Playground形式）
└── README.md          # このファイル
```

## 使用方法（プロジェクトルートから実行）

### 1. SpiceDB サーバー起動

```bash
# プロジェクトルートで実行
docker-compose up -d spicedb
```

### 2. スキーマとリレーション一括投入

```bash
# relationships.yamlから一括投入（推奨）
docker run --rm -i \
  --network host \
  -v "$(pwd)/authorization/spicedb:/work" \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  import /work/relationships.yaml
```

## 個別操作（必要に応じて）

### スキーマのみ投入

```bash
docker run --rm -i \
  --network host \
  -v "$(pwd)/authorization/spicedb:/work" \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  schema write /work/schema.zed
```

### リレーション個別作成

```bash
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  relationship create global:main admin user:taro
```

## 権限チェック

```bash
# グローバル管理者権限チェック
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  permission check global:main full_access user:taro

# システム管理者権限チェック
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  permission check system:system1 admin user:jiro

# 読み取り権限チェック
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  permission check system:system1 read user:hanako
```

## データ確認

```bash
# 現在のリレーション一覧
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  relationship read --limit 100

# 現在のスキーマ表示
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  schema read
```

## 権限構造

### 定義されたリソース

- **user**: 基本ユーザーエンティティ
- **global**: グローバル権限
- **system**: システムリソース
- **aws**: AWS アカウントリソース
- **user_management**: ユーザー管理リソース
- **api**: API アクセスリソース

### ロール階層

| ロール  | 読取 | 書込 | 削除 | 管理 |
| ------- | ---- | ---- | ---- | ---- |
| Owner   | ✓    | ✓    | ✓    | ✓    |
| Manager | ✓    | ✓    | ✓    | ✗    |
| Staff   | ✓    | ✗    | ✗    | ✗    |

### 投入済みリレーション

- **taro**: グローバル管理者
- **jiro**: system1, system2 の owner / aws1 の owner
- **saburo**: system1, system3 の manager / aws1 の manager
- **hanako**: system2, system3 の staff / aws1 の staff
- **alice**: system4 の staff / aws2 の owner

## エンドポイント

- **gRPC**: `localhost:50051`
- **HTTP**: `localhost:8080`

## トラブルシューティング

### SpiceDB サーバーが起動しない

```bash
# ログ確認
docker-compose logs spicedb

# 手動起動テスト
docker run --rm -p 50051:50051 -p 8080:8080 authzed/spicedb:v1.44.4 serve --help
```

### リレーション投入に失敗する

```bash
# SpiceDBサーバーの状態確認
curl -s http://localhost:8080/healthz

# 既存データとの競合確認
docker run --rm -i \
  --network host \
  authzed/zed \
  --endpoint localhost:50051 \
  --token spicedb-secret-key \
  --insecure \
  schema read
```

## 参考リンク

- [SpiceDB 公式ドキュメント](https://authzed.com/docs)
- [authzed/zed CLI](https://github.com/authzed/zed)
- [SpiceDB Playground](https://play.authzed.com)
