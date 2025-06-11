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
このネットワークに入っている状態で認証済みとします

### 構成図

```mermaid
flowchart TB
    subgraph Network["認証済みネットワーク"]

        subgraph Frontend["フロントエンド"]
            AWS_WEB["AWS Web<br/>(localhost:3000)<br/> AWS アカウント管理 UI"]
            SYSTEM_WEB["System Web<br/>(localhost:3001)<br/>システム管理 UI"]
        end

        subgraph Backend["バックエンドサービス"]
            AWS_SERVICE["AWS Service<br/>(localhost:3003)<br/>AWS アカウント管理 API"]
            SYSTEM_SERVICE["System Service<br/>(localhost:3004)<br/>システム管理 API"]
        end

        subgraph UserMgmt["ユーザー管理"]
            USER_SERVICE["User Service<br/>(localhost:3005)<br/>ユーザー管理 API"]
        end

        subgraph AuthSys["認可システム"]
            AUTH_SERVER["認可サーバ<br/>(localhost:8080)<br/>Casbin/OPA/SpiceDB 切り替え可能"]
        end

        subgraph Database["データベース"]
            SYSTEM_DB["System DB<br/>(localhost:5433)"]
            AWS_DB["AWS DB<br/>(localhost:5434)"]
            USER_DB["User DB<br/>(localhost:5435)"]
            SPICEDB_DB["SpiceDB<br/>(localhost:5436)"]
        end
    end

    AWS_WEB --> AWS_SERVICE
    AWS_WEB --> USER_SERVICE
    SYSTEM_WEB --> SYSTEM_SERVICE
    SYSTEM_WEB --> USER_SERVICE

    AWS_SERVICE --> USER_SERVICE
    SYSTEM_SERVICE --> USER_SERVICE

    USER_SERVICE --> AUTH_SERVER

    AWS_SERVICE --> AWS_DB
    SYSTEM_SERVICE --> SYSTEM_DB
    USER_SERVICE --> USER_DB
    AUTH_SERVER --> SPICEDB_DB
```

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

## 権限体系

### 認可条件

1. **Admin（管理者）**

   - フルアクセス権限を持つ
   - 全システム・全 AWS リソースにアクセス可能

2. **ユーザの所属**

   - ユーザは複数のシステムに所属可能
   - システムごとに異なる権限を持てる

3. **システム権限**

   - **オーナー**: システム全権（メンバー管理含む）
   - **マネージャー**: システムの修正、メンバー操作不可
   - **スタッフ**: 閲覧のみ

4. **AWS 権限**
   - AWS は単一のシステムに所属
   - **AWS 権限はシステム権限とは完全に独立**
   - システムでのロールに関係なく、AWS 権限は個別に付与される
   - オーナー・マネージャー・スタッフが存在
   - マネージャーはスタッフと同じ権限（閲覧のみ）

### 権限マトリックス

#### システム権限

| ロール       | 読取 | 更新 | 削除 | メンバー管理 |
| ------------ | ---- | ---- | ---- | ------------ |
| Admin        | ✓    | ✓    | ✓    | ✓            |
| オーナー     | ✓    | ✓    | ✓    | ✓            |
| マネージャー | ✓    | ✓    | ✓    | ✗            |
| スタッフ     | ✓    | ✗    | ✗    | ✗            |

#### AWS 権限（システム権限とは独立）

| ロール       | 読取 | 更新 | 削除 | 管理 |
| ------------ | ---- | ---- | ---- | ---- |
| Admin        | ✓    | ✓    | ✓    | ✓    |
| オーナー     | ✓    | ✓    | ✓    | ✓    |
| マネージャー | ✓    | ✗    | ✗    | ✗    |
| スタッフ     | ✓    | ✗    | ✗    | ✗    |

### 権限の独立性の例

**例**：ユーザー`saburo`の場合

- システム権限：`system1`の**マネージャー**、`system3`の**マネージャー**
- AWS 権限：`aws1`の**マネージャー**（`system1`に所属するが、システム権限とは独立）

この場合、`saburo`は：

- `system1`では更新・削除が可能（マネージャー権限）
- `aws1`では閲覧のみ可能（AWS マネージャーはスタッフと同じ権限）
- システムでの権限とは関係なく、AWS 権限は個別に設定される

## 検証

本プロジェクトでは、以下の観点で 3 つの認可システムを比較検証します。

### 認可の記述方法

#### Casbin

書く

#### OPA (Open Policy Agent)

書く

#### SpiceDB

書く

### 権限の更新方法

#### Casbin

書く

#### OPA

書く

#### SpiceDB

書く

### ついでに検証

フロントエンド、バックエンドからの認可情報による 403 制御が可能か

### 検証シナリオ

1. **基本的な RBAC**

   - ユーザーにロールを割り当て
   - ロールごとのリソースアクセス制御

2. **動的権限変更**

   - 運用中の権限追加/削除
   - 権限変更の反映時間計測

3. **複雑な権限関係**

   - 階層ロール（Admin > Owner > Manager > Staff）
   - リソース固有の権限設定

4. **パフォーマンス**
   - 大量ユーザー・リソースでの応答時間
   - メモリ使用量の比較

### 比較ポイント

- **学習コスト**: 設定の難易度・理解しやすさ
- **柔軟性**: 複雑な権限要件への対応力
- **パフォーマンス**: レスポンス時間・リソース使用量
- **運用性**: 権限管理の容易さ・デバッグのしやすさ
- **スケーラビリティ**: 大規模環境での性能

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

## 学習リソース

- [Casbin Documentation](https://casbin.org/)
- [OPA Documentation](https://www.openpolicyagent.org/)
- [SpiceDB Documentation](https://authzed.com/docs/)
