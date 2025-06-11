package authz

# デフォルトで認可を拒否
default allow := false

# ユーザーのロール定義
user_roles := {
    "taro": "admin",
    "jiro": "owner", 
    "saburo": "manager",
    "hanako": "staff"
}

# リソースとユーザーの関係定義
resource_assignments := {
    "system:system1": ["jiro"],
    "system:system2": ["jiro"],
    "system:system3": ["saburo", "hanako"],
    "aws_account:aws_account_1": ["jiro"],
    "aws_account:aws_account_2": ["jiro"],
    "aws_account:aws_account_3": ["saburo", "hanako"],
    "user_management:main": ["taro", "saburo", "hanako"],
    "api:main": ["taro", "jiro", "saburo", "hanako"],
    "global:main": ["taro"]
}

# ロール別の権限定義
role_permissions := {
    "admin": {
        "system": ["read", "write", "delete", "admin"],
        "aws_account": ["read", "write", "delete", "admin"],
        "user_management": ["read", "write", "delete", "admin"],
        "api": ["read", "write", "delete", "admin"],
        "global": ["read", "write", "delete", "admin"]
    },
    "owner": {
        "system": ["read", "write", "delete", "admin"],
        "aws_account": ["read", "write", "delete", "admin"],
        "api": ["read", "write", "delete"],
        "user_management": ["read"],
        "global": ["read"]
    },
    "manager": {
        "system": ["read", "write", "delete"],
        "aws_account": ["read", "write", "delete"],
        "user_management": ["read"],
        "api": ["read", "write"],
        "global": ["read"]
    },
    "staff": {
        "system": ["read"],
        "aws_account": ["read"],
        "user_management": ["read"],
        "api": ["read"],
        "global": ["read"]
    }
}

# リソースタイプの抽出（例: "system:system1" -> "system"）
resource_type(resource) := type if {
    parts := split(resource, ":")
    count(parts) > 0
    type := parts[0]
}

# メイン認可ルール
allow if {
    # ユーザーのロールを取得
    user_role := user_roles[input.subject]
    
    # リソースタイプを取得
    res_type := resource_type(input.resource)
    
    # Admin は全リソースにアクセス可能
    user_role == "admin"
}

allow if {
    # ユーザーのロールを取得
    user_role := user_roles[input.subject]
    
    # リソースタイプを取得
    res_type := resource_type(input.resource)
    
    # ユーザーがリソースにアサインされているかチェック
    input.subject in resource_assignments[input.resource]
    
    # ロールが該当する権限を持っているかチェック
    input.permission in role_permissions[user_role][res_type]
}

# 詳細な理由を提供するためのルール
reason := "Access denied: User not found" if {
    not user_roles[input.subject]
}

reason := sprintf("Access denied: User %s does not have %s permission on %s", [input.subject, input.permission, input.resource]) if {
    user_roles[input.subject]
    not allow
}

reason := "Access granted" if allow

# デバッグ用: ユーザー情報を取得
user_info := {
    "role": user_roles[input.subject],
    "assigned_resources": [res | res := resource_assignments[_]; input.subject in resource_assignments[res]]
} if user_roles[input.subject] 