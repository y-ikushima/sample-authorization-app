# OPA Authorization Server

Open Policy Agent (OPA) を使用した階層型認可システムです。Rego 言語でポリシーを記述し、Casbin や SpiceDB と同等の認可機能を提供します。

## 機能

- **Rego ポリシー**: 宣言的なポリシー言語による柔軟な権限定義
- **階層権限**: Admin > Owner > Manager > Staff の 4 段階権限
- **設定ファイル**: YAML 形式でユーザーとリソースを管理
- **カスタムクエリ**: 任意の Rego クエリを実行可能

## 権限レベル

### Admin (taro)

- 全操作が可能
- グローバルリソース、システム、AWS アカウント、ユーザー管理の全権限

### Owner (jiro)

- 割り当てられたシステムと AWS アカウントの全権限
- システム 1、システム 2、AWS アカウント 1、AWS アカウント 2 を管理

### Manager (saburo)

- システムと AWS アカウントの編集可能
- システム 3、AWS アカウント 3 を管理
- ユーザー管理は閲覧のみ

### Staff (hanako)

- アサインされたリソースの閲覧のみ
- システム 3、AWS アカウント 3 の閲覧権限

## API エンドポイント

### 認可チェック

```bash
POST /authorize
{
  "subject": "taro",
  "resource": "global:main",
  "permission": "admin"
}
```

### カスタムクエリ実行

```bash
POST /evaluate
{
  "query": "data.authz.user_info",
  "input": {"subject": "jiro", "resource": "system:system1", "permission": "read"}
}
```

### ユーザー一覧

```bash
GET /users
```

### リソース一覧

```bash
GET /resources
```

### ヘルスチェック

```bash
GET /health
```

## セットアップ

### Docker 実行

```bash
# ビルドと実行
docker build -f Dockerfile.dev -t opa-auth .
docker run -p 8082:8082 opa-auth
```

### ローカル実行

```bash
# 依存関係のインストール
go mod tidy

# サーバー起動
go run main.go
```

## ポリシー言語 (Rego)

OPA では**Rego**言語でポリシーを記述します：

```rego
# デフォルトで拒否
default allow := false

# Admin は全リソースにアクセス可能
allow if {
    user_role := user_roles[input.subject]
    user_role == "admin"
}

# ユーザーがリソースにアサインされ、権限を持つ場合
allow if {
    user_role := user_roles[input.subject]
    input.subject in resource_assignments[input.resource]
    input.permission in role_permissions[user_role][resource_type(input.resource)]
}
```

## 設定ファイル

### config.yaml

- ユーザー情報とロール
- リソース定義と所有者関係
- ロール別権限設定

### policy.rego

- Rego ポリシーによる認可ルール
- カスタマイズ可能な権限ロジック

## 他の認可システムとの比較

| 特徴           | Casbin        | SpiceDB      | OPA              |
| -------------- | ------------- | ------------ | ---------------- |
| **ポート**     | 8080          | 8081         | 8082             |
| **言語**       | 設定ファイル  | Zanzibar DSL | Rego             |
| **複雑度**     | シンプル      | 中程度       | 高度             |
| **柔軟性**     | 中程度        | 高い         | 非常に高い       |
| **学習コスト** | 低い          | 中程度       | 高い             |
| **適用範囲**   | 基本的な RBAC | Google 規模  | あらゆるポリシー |

## 利用例

```bash
# taroのadmin権限チェック
curl -X POST http://localhost:8082/authorize \
  -H "Content-Type: application/json" \
  -d '{"subject": "taro", "resource": "global:main", "permission": "admin"}'

# jiroのシステム権限チェック
curl -X POST http://localhost:8082/authorize \
  -H "Content-Type: application/json" \
  -d '{"subject": "jiro", "resource": "system:system1", "permission": "write"}'

# hanakoの権限情報取得
curl -X POST http://localhost:8082/evaluate \
  -H "Content-Type: application/json" \
  -d '{"query": "data.authz.user_info", "input": {"subject": "hanako"}}'
```
