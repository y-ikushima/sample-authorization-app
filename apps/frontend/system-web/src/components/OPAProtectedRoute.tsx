import { useOPAPermission } from "@/hooks/useOPAAccessControl";
import React, { ReactNode } from "react";

interface OPAProtectedRouteProps {
  children: ReactNode;
  resource: string;
  permission?: string;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

interface OPAProtectedButtonProps {
  children: ReactNode;
  resource: string;
  permission?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  className?: string;
}

/**
 * OPA用のページアクセス制御コンポーネント
 */
export const OPAProtectedRoute: React.FC<OPAProtectedRouteProps> = ({
  children,
  resource,
  permission = "read",
  fallback = (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fff3cd",
        color: "#856404",
        border: "1px solid #ffeaa7",
        borderRadius: "4px",
        margin: "20px 0",
        textAlign: "center",
      }}
    >
      <h3>アクセスが拒否されました</h3>
      <p>このページにアクセスする権限がありません。</p>
      <p>管理者にお問い合わせください。</p>
    </div>
  ),
  loadingComponent = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px",
      }}
    >
      <p>OPA権限を確認中...</p>
    </div>
  ),
}) => {
  const { hasPermission, loading, error } = useOPAPermission(
    resource,
    permission
  );

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          margin: "20px 0",
        }}
      >
        <h3>OPAエラーが発生しました</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * OPA用のボタンアクセス制御コンポーネント
 */
export const OPAProtectedButton: React.FC<OPAProtectedButtonProps> = ({
  children,
  resource,
  permission = "read",
  onClick,
  style,
  disabled = false,
  className,
}) => {
  const { hasPermission, loading } = useOPAPermission(resource, permission);

  // 権限がない場合は何も表示しない
  if (!hasPermission) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...style,
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        backgroundColor: loading ? "#6c757d" : style?.backgroundColor,
      }}
      className={className}
    >
      {loading ? "OPA確認中..." : children}
    </button>
  );
};

/**
 * OPA用の権限分岐表示コンポーネント
 */
interface OPAConditionalProps {
  resource: string;
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const OPAConditional: React.FC<OPAConditionalProps> = ({
  resource,
  permission = "read",
  children,
  fallback = null,
}) => {
  const { hasPermission, loading } = useOPAPermission(resource, permission);

  if (loading) {
    return (
      <div style={{ opacity: 0.6 }}>
        <small>OPA権限確認中...</small>
      </div>
    );
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};
