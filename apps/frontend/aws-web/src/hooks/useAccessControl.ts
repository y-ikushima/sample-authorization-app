import * as casbin from "@/lib/casbin";
import * as opa from "@/lib/opa";
import * as spicedb from "@/lib/spicedb";
import { useEffect, useState } from "react";

export type AuthSystem = "casbin" | "spicedb" | "opa";

/**
 * 権限チェック用のフック
 */
export const usePermission = (
  resource: string,
  permission: string,
  authSystem: AuthSystem
) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true);
        setError(null);

        let result = false;
        switch (authSystem) {
          case "casbin":
            result = await casbin.checkPermission(resource, permission);
            break;
          case "spicedb":
            result = await spicedb.checkPermission(resource, permission);
            break;
          case "opa":
            result = await opa.checkPermission(resource, permission);
            break;
        }

        setHasPermission(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "権限チェックエラー");
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [resource, permission, authSystem]);

  return { hasPermission, loading, error };
};

/**
 * AWSアカウントアクセス権限チェック用のフック
 */
export const useAWSAccess = (
  awsId: string,
  permission: string,
  authSystem: AuthSystem
) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        let result = false;
        switch (authSystem) {
          case "casbin":
            result = await casbin.checkPermission(`/aws/${awsId}`, permission);
            break;
          case "spicedb":
            result = await spicedb.checkAWSAccess(awsId, permission);
            break;
          case "opa":
            result = await opa.checkAWSAccess(awsId, permission);
            break;
        }

        setHasAccess(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "権限チェックエラー");
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (awsId) {
      checkAccess();
    }
  }, [awsId, permission, authSystem]);

  return { hasAccess, loading, error };
};

/**
 * システムアクセス権限チェック用のフック
 */
export const useSystemAccess = (
  systemId: string,
  permission: string,
  authSystem: AuthSystem
) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        let result = false;
        switch (authSystem) {
          case "casbin":
            result = await casbin.checkSystemAccess(systemId, permission);
            break;
          case "spicedb":
            result = await spicedb.checkSystemAccess(systemId, permission);
            break;
          case "opa":
            result = await opa.checkSystemAccess(systemId, permission);
            break;
        }

        setHasAccess(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "権限チェックエラー");
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (systemId) {
      checkAccess();
    }
  }, [systemId, permission, authSystem]);

  return { hasAccess, loading, error };
};

/**
 * グローバル管理者権限チェック用のフック
 */
export const useGlobalAdminPermission = (authSystem: AuthSystem) => {
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGlobalAdmin = async () => {
      try {
        setLoading(true);
        setError(null);

        let result = false;
        switch (authSystem) {
          case "casbin":
            result = await casbin.checkPermission("global:main", "*");
            break;
          case "spicedb":
            result = await spicedb.checkGlobalAdminPermission();
            break;
          case "opa":
            result = await opa.checkGlobalAdminPermission();
            break;
        }

        setIsGlobalAdmin(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "権限チェックエラー");
        setIsGlobalAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkGlobalAdmin();
  }, [authSystem]);

  return { isGlobalAdmin, loading, error };
};
