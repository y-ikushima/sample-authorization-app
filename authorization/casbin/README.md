# Casbin Authorization Server

Casbin を使用した RBAC（Role-Based Access Control）認可サーバーです。

## 機能

- **認可チェック**: Subject、Object、Action に基づいてアクセス許可を判定
- **ポリシー管理**: 動的にポリシーの追加・削除が可能
- **RBAC**: ロールベースアクセス制御をサポート
- **REST API**: HTTP ベースでの認可チェックとポリシー管理

## API エンドポイント

### 認可チェック

```bash
POST /authorize
{
  "subject": "john",
  "object": "/api/users",
  "action": "GET"
}
```

### ポリシー取得

```bash
GET /policies
```

### ポリシー追加

```bash
POST /policies
{
  "policy": ["alice", "/api/read", "GET"]
}
```

### ポリシー削除

```bash
DELETE /policies
{
  "policy": ["alice", "/api/read", "GET"]
}
```

### ヘルスチェック

```bash
GET /health
```

## 使用例

サーバーを起動した後：

```bash
# 認可チェックの例
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "john",
    "object": "/api/users",
    "action": "GET"
  }'

# ポリシー追加の例
curl -X POST http://localhost:8080/policies \
  -H "Content-Type: application/json" \
  -d '{
    "policy": ["bob", "/api/posts", "POST"]
  }'
```

## デフォルトポリシー

- `admin` ロール: 全てのリソースへのアクセス権限
- `user` ロール: 読み取り専用アクセス権限
- `john` は `admin` ロールを持つ
- `alice` は `user` ロールを持つ
