import { checkPermission, checkSystemAccess, Permission } from "@/lib/casbin";
import { useEffect, useState } from "react";

/**
 * 単一の権限チェック用のカスタムフック
 */
export const usePermission = (resource: string, action: string = "GET") => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkPermission(resource, action);
        setHasPermission(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "権限チェックに失敗しました"
        );
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [resource, action]);

  return { hasPermission, loading, error };
};

/**
 * システムアクセス権限チェック用のカスタムフック
 */
export const useSystemAccess = (
  systemId: string | string[] | undefined,
  action: string = "GET"
) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!systemId || Array.isArray(systemId)) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkSystemAccess(systemId, action);
        setHasAccess(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "システムアクセスチェックに失敗しました"
        );
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [systemId, action]);

  return { hasAccess, loading, error };
};

/**
 * 複数権限チェック用のカスタムフック
 */
export const useMultiplePermissions = (permissions: Permission[]) => {
  const [permissionResults, setPermissionResults] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAllPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          permissions.map(({ resource, action = "GET" }) =>
            checkPermission(resource, action)
          )
        );

        setPermissionResults(results);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "権限チェックに失敗しました"
        );
        setPermissionResults(permissions.map(() => false));
      } finally {
        setLoading(false);
      }
    };

    if (permissions.length > 0) {
      checkAllPermissions();
    } else {
      setLoading(false);
    }
  }, [permissions]);

  return { permissionResults, loading, error };
};
