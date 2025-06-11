# sample-authorization-app

## プロジェクト概要

このリポジトリは、3 つの異なる認可システム（**Casbin**、**OPA**、**SpiceDB**）を比較検証するためのサンプルアプリケーションです。  
マイクロサービス環境での RBAC（Role-Based Access Control）の実装パターンを学習し、それぞれの特徴を理解することを目的としています。

## 認可サーバ比較表

| 認可システム | ポート | 特徴                 |
| ------------ | ------ | -------------------- |
| **Casbin**   | 8080   | シンプルな RBAC      |
| **OPA**      | 8081   | ポリシー言語(Rego)   |
| **SpiceDB**  | 8082   | Google Zanzibar 方式 |

## システム構成

### 前提条件

このシステム上では認可のみの検証を行います  
認証はこのネットワークに入っている状態で認証済みとします

### フロントエンド

- **AWS Web** (localhost:3000) - AWS アカウント管理 UI
- **System Web** (localhost:3001) - システム管理 UI

### バックエンドサービス

- **AWS Service** (localhost:3003) - AWS アカウント管理 API
- **System Service** (localhost:3004) - システム管理 API
- **User Service** (localhost:3005) - ユーザー管理 API

### データベース

- **PostgreSQL** - 各サービス専用 DB
  - System DB (localhost:5433)
  - AWS DB (localhost:5434)
  - User DB (localhost:5435)
  - SpiceDB (localhost:5436)

## 検証の要点

### 1. パフォーマンス比較

- レスポンス時間の測定
- 同時接続数の処理能力
- メモリ使用量の比較

### 2. 実装の複雑さ

- ポリシー定義の可読性
- 開発者の学習コスト
- メンテナンス性

### 3. 機能の豊富さ

- 階層権限の表現力
- 動的権限変更の対応
- 監査ログの充実度

### 4. 運用面の考慮

- デプロイの容易さ
- 監視・ログの取得
- 障害対応の難易度

## 権限体系

### ロール階層

```
Admin (taro)
  └── Owner (jiro)
       └── Manager (saburo)
            └── Staff (hanako)
```

### リソース種別

- **Global**: 全体管理
- **System**: システム管理
- **AWS Account**: AWS アカウント管理
- **User**: ユーザー管理

## 環境構築

### 前提条件

- Docker & Docker Compose
- .env.local ファイルの設定

### 起動方法

```bash
# 全サービス起動
docker compose watch

# サービス停止
docker compose down
```

### 動作確認

```bash
# Casbin認可チェック
curl -X POST http://localhost:8080/authorize \
  -H "Content-Type: application/json" \
  -d '{"subject": "john", "object": "/api/users", "action": "GET"}'

# OPA認可チェック
curl -X POST http://localhost:8081/authorize \
  -H "Content-Type: application/json" \
  -d '{"subject": "taro", "resource": "global:main", "permission": "admin"}'

# SpiceDB認可チェック
curl -X POST http://localhost:8082/authorize \
  -H "Content-Type: application/json" \
  -d '{"subject": "taro", "resource": "system:system1", "permission": "read"}'
```

## 検証項目

### 基本機能テスト

- [ ] 認可判定の正確性
- [ ] ポリシー更新の反映
- [ ] エラーハンドリング

### パフォーマンステスト

- [ ] 認可判定のレスポンス時間
- [ ] 大量リクエスト処理
- [ ] メモリ使用量監視

### 運用テスト

- [ ] ログ出力の確認
- [ ] 障害時の動作
- [ ] 設定変更の影響範囲

## 学習リソース

- [Casbin Documentation](https://casbin.org/)
- [OPA Documentation](https://www.openpolicyagent.org/)
- [SpiceDB Documentation](https://authzed.com/docs/)
