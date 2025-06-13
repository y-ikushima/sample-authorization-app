import { useSpiceDBPermission } from "@/hooks/useSpiceDBAccessControl";
import React, { ReactNode } from "react";

interface SpiceDBProtectedRouteProps {
  children: ReactNode;
  resource: string;
  permission?: string;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

interface SpiceDBProtectedButtonProps {
  children: ReactNode;
  resource: string;
  permission?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  className?: string;
}

/**
 * SpiceDB用のページアクセス制御コンポーネント
 */
export const SpiceDBProtectedRoute: React.FC<SpiceDBProtectedRouteProps> = ({
  children,
  resource,
  permission = "read",
  fallback = (
    <div style={{ color: "red", textAlign: "center", padding: "20px" }}>
      このページにアクセスする権限がありません。
    </div>
  ),
  loadingComponent = (
    <div style={{ textAlign: "center", padding: "20px" }}>
      権限を確認しています...
    </div>
  ),
}) => {
  const { hasPermission, loading, error } = useSpiceDBPermission(
    resource,
    permission
  );

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (error) {
    return (
      <div style={{ color: "red", textAlign: "center", padding: "20px" }}>
        権限チェックでエラーが発生しました: {error}
      </div>
    );
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * SpiceDB用のボタンアクセス制御コンポーネント
 */
export const SpiceDBProtectedButton: React.FC<SpiceDBProtectedButtonProps> = ({
  children,
  resource,
  permission = "read",
  onClick,
  style,
  disabled = false,
  className,
}) => {
  const { hasPermission, loading } = useSpiceDBPermission(resource, permission);

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
      }}
      className={className}
    >
      {loading ? "確認中..." : children}
    </button>
  );
};
