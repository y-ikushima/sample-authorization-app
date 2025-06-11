package authz

# デフォルトで認可を拒否
default allow := false

# システム権限の定義（ユーザーは複数のシステムに所属可能）
user_system_roles := {
    "jiro": {
        "system1": "owner",
        "system2": "owner"
    },
    "saburo": {
        "system1": "manager",
        "system3": "manager"
    },
    "hanako": {
        "system2": "staff",
        "system3": "staff"
    }
}

# AWS権限の定義（システム権限とは完全に独立）
# システムでのロールに関係なく、AWS権限は個別に設定される
user_aws_roles := {
    "jiro": {
        "aws1": "owner"
    },
    "saburo": {
        "aws1": "manager"
    },
    "hanako": {
        "aws1": "staff"
    }
}

# グローバル権限の定義
user_global_roles := {
    "taro": "admin"
}

# Admin はフルアクセス
allow {
    user_global_roles[input.subject] == "admin"
}

# システムリソースの場合
allow {
    startswith(input.resource, "system:")
    system_id := split(input.resource, ":")[1]
    user_role := user_system_roles[input.subject][system_id]
    permission_check(user_role, input.permission)
}

# AWSリソースの場合（システム権限とは独立して判定）
allow {
    startswith(input.resource, "aws:")
    aws_id := split(input.resource, ":")[1]
    user_role := user_aws_roles[input.subject][aws_id]
    aws_permission_check(user_role, input.permission)
}

# システム権限チェック関数
permission_check(role, permission) {
    role == "owner"
}

permission_check(role, permission) {
    role == "manager"
    permission == "read"
}

permission_check(role, permission) {
    role == "manager"
    permission == "write"
}

permission_check(role, permission) {
    role == "manager"
    permission == "delete"
}

permission_check(role, permission) {
    role == "staff"
    permission == "read"
}

# AWS権限チェック関数（システム権限とは独立）
aws_permission_check(role, permission) {
    role == "owner"
}

aws_permission_check(role, permission) {
    role == "manager"
    permission == "read"
}

aws_permission_check(role, permission) {
    role == "staff"
    permission == "read"
}

# 詳細な理由を提供するためのルール
reason := "Access denied: User not found" {
    not user_global_roles[input.subject]
    not user_system_roles[input.subject]
    not user_aws_roles[input.subject]
}

reason := sprintf("Access denied: User %s does not have %s permission on %s", [input.subject, input.permission, input.resource]) {
    user_exists
    not allow
}

reason := "Access granted" {
    allow
}

# ユーザーが存在するかチェック
user_exists {
    user_global_roles[input.subject]
}

user_exists {
    user_system_roles[input.subject]
}

user_exists {
    user_aws_roles[input.subject]
}

# デバッグ用: ユーザー情報を取得
user_info := {
    "global_role": user_global_roles[input.subject],
    "system_roles": user_system_roles[input.subject],
    "aws_roles": user_aws_roles[input.subject]
} 