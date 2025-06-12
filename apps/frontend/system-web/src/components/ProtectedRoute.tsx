import { usePermission } from "@/hooks/useAccessControl";
import React, { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  resource: string;
  action?: string;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

/**
 * 権限ベースのアクセス制御を行うコンポーネント
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  resource,
  action = "GET",
  fallback,
  loadingComponent,
}) => {
  const { hasPermission, loading, error } = usePermission(resource, action);

  // ローディング中
  if (loading) {
    return (
      <div>
        {loadingComponent || (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <p>権限を確認中...</p>
          </div>
        )}
      </div>
    );
  }

  // エラー発生時
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
        <h3>エラーが発生しました</h3>
        <p>{error}</p>
      </div>
    );
  }

  // アクセス権限がない場合
  if (!hasPermission) {
    return (
      <div>
        {fallback || (
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
        )}
      </div>
    );
  }

  // アクセス権限がある場合、子コンポーネントを表示
  return <>{children}</>;
};

interface ProtectedButtonProps {
  children: ReactNode;
  resource: string;
  action?: string;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 権限ベースで表示・非表示を制御するボタンコンポーネント
 */
export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  children,
  resource,
  action = "GET",
  onClick,
  disabled = false,
  style,
  className,
}) => {
  const { hasPermission, loading } = usePermission(resource, action);

  // 権限チェック中またはアクセス権限がない場合は非表示
  if (loading || !hasPermission) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={className}
    >
      {children}
    </button>
  );
};
