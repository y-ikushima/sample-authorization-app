import { checkPermission, checkSystemAccess, Permission } from "@/lib/opa";
import { useEffect, useState } from "react";

/**
 * 単一の権限チェック用のカスタムフック
 */
export const useOPAPermission = (
  resource: string,
  permission: string = "read"
) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkPermission(resource, permission);
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
  }, [resource, permission]);

  return { hasPermission, loading, error };
};

/**
 * システムアクセス用のカスタムフック
 */
export const useOPASystemAccess = (
  systemId: string,
  permission: string = "read"
) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkSystemAccess(systemId, permission);
        setHasAccess(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "アクセスチェックに失敗しました"
        );
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (systemId) {
      checkAccess();
    } else {
      setLoading(false);
      setHasAccess(false);
    }
  }, [systemId, permission]);

  return { hasAccess, loading, error };
};

/**
 * 複数権限チェック用のカスタムフック
 */
export const useOPAMultiplePermissions = (permissions: Permission[]) => {
  const [permissionResults, setPermissionResults] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAllPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          permissions.map(({ resource, permission = "read" }) =>
            checkPermission(resource, permission)
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

/**
 * グローバル権限チェック用のフック
 */
export const useOPAGlobalPermission = () => {
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGlobalAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkPermission("global:main", "admin");
        setIsGlobalAdmin(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "グローバル権限チェックに失敗しました"
        );
        setIsGlobalAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkGlobalAccess();
  }, []);

  return { isGlobalAdmin, loading, error };
};
