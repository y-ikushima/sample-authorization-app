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

# システム権限チェック
allow if {
    # Admin はフルアクセス
    user_global_roles[input.subject] == "admin"
}

allow if {
    # システムリソースの場合
    startswith(input.resource, "system:")
    
    # リソースからシステムIDを抽出
    system_id := split(input.resource, ":")[1]
    
    # ユーザーがそのシステムに権限を持っているかチェック
    user_role := user_system_roles[input.subject][system_id]
    
    # 権限チェック
    permission_check(user_role, input.permission)
}

allow if {
    # AWSリソースの場合（システム権限とは独立して判定）
    startswith(input.resource, "aws:")
    
    # リソースからAWS IDを抽出
    aws_id := split(input.resource, ":")[1]
    
    # ユーザーがそのAWSに権限を持っているかチェック（システム権限とは無関係）
    user_role := user_aws_roles[input.subject][aws_id]
    
    # AWS権限チェック（システム権限とは独立）
    aws_permission_check(user_role, input.permission)
}

# システム権限チェック関数
permission_check(role, permission) if {
    role == "owner"
    # オーナーは全権限
}

permission_check(role, permission) if {
    role == "manager"
    # マネージャーはシステムの修正可能、メンバー操作不可
    permission in ["read", "write", "delete"]
}

permission_check(role, permission) if {
    role == "staff"
    # スタッフは閲覧のみ
    permission == "read"
}

# AWS権限チェック関数（システム権限とは独立）
aws_permission_check(role, permission) if {
    role == "owner"
    # AWSオーナーは全権限
}

aws_permission_check(role, permission) if {
    role == "manager"
    # AWSマネージャーはスタッフと同じ権限（閲覧のみ）
    permission == "read"
}

aws_permission_check(role, permission) if {
    role == "staff"
    # AWSスタッフは閲覧のみ
    permission == "read"
}

# 詳細な理由を提供するためのルール
reason := "Access denied: User not found" if {
    not user_global_roles[input.subject]
    not user_system_roles[input.subject]
    not user_aws_roles[input.subject]
}

reason := sprintf("Access denied: User %s does not have %s permission on %s", [input.subject, input.permission, input.resource]) if {
    (user_global_roles[input.subject] or user_system_roles[input.subject] or user_aws_roles[input.subject])
    not allow
}

reason := "Access granted" if allow

# デバッグ用: ユーザー情報を取得
user_info := {
    "global_role": user_global_roles[input.subject],
    "system_roles": user_system_roles[input.subject],
    "aws_roles": user_aws_roles[input.subject]
} 