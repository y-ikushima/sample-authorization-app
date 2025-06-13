import { getCurrentUserId } from "./auth";

// Next.jsのAPIルートを使用（CORSエラー回避のため）
const SPICEDB_API_BASE = "/api/spicedb";

/**
 * バックエンドのSpiceDBサービスに送信するリクエスト型
 */
interface SpiceDBAuthRequest {
  subject: string;
  resource: string;
  permission: string;
}

/**
 * バックエンドのSpiceDBサービスからのレスポンス型
 */
interface SpiceDBAuthResponse {
  allowed: boolean;
  reason?: string;
}

/**
 * ユーザーが指定したリソースにアクセス可能かチェックする
 */
export const checkPermission = async (
  resource: string,
  permission: string = "read"
): Promise<boolean> => {
  try {
    const userId = getCurrentUserId();

    const authRequest: SpiceDBAuthRequest = {
      subject: userId,
      resource: resource,
      permission: permission,
    };

    console.log(
      `SpiceDB権限チェック開始: user=${userId}, resource=${resource}, permission=${permission}`
    );

    const response = await fetch(`${SPICEDB_API_BASE}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authRequest),
    });

    if (!response.ok) {
      console.error(
        `SpiceDBサービスエラー: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const authResponse: SpiceDBAuthResponse = await response.json();

    console.log(
      `SpiceDB権限チェック結果: user=${userId}, resource=${resource}, permission=${permission}, allowed=${authResponse.allowed}`
    );

    if (!authResponse.allowed && authResponse.reason) {
      console.log(`アクセス拒否理由: ${authResponse.reason}`);
    }

    return authResponse.allowed;
  } catch (error) {
    console.error("SpiceDB権限チェックエラー:", error);
    return false;
  }
};

/**
 * ユーザーが特定のAWSアカウントにアクセス可能かチェックする
 */
export const checkAWSAccess = async (
  awsId: string,
  permission: string = "read"
): Promise<boolean> => {
  return await checkPermission(`aws:${awsId}`, permission);
};

/**
 * AWSアカウントの編集権限をチェックする
 */
export const checkAWSEditPermission = async (
  awsId: string
): Promise<boolean> => {
  return await checkPermission(`aws:${awsId}`, "write");
};

/**
 * AWSアカウントの削除権限をチェックする
 */
export const checkAWSDeletePermission = async (
  awsId: string
): Promise<boolean> => {
  return await checkPermission(`aws:${awsId}`, "delete");
};

/**
 * AWSアカウントのメンバー管理権限をチェックする
 */
export const checkAWSMemberManagePermission = async (
  awsId: string
): Promise<boolean> => {
  return await checkPermission(`aws:${awsId}`, "manage_members");
};

/**
 * グローバル管理者権限をチェックする
 */
export const checkGlobalAdminPermission = async (): Promise<boolean> => {
  return await checkPermission("global:main", "admin");
};

/**
 * システムアクセス権限をチェックする
 */
export const checkSystemAccess = async (
  systemId: string,
  permission: string = "read"
): Promise<boolean> => {
  return await checkPermission(`system:${systemId}`, permission);
};

/**
 * ページアクセス制御用のPermission型
 */
export interface Permission {
  resource: string;
  permission?: string;
}

/**
 * 複数の権限をチェックする
 */
export const checkMultiplePermissions = async (
  permissions: Permission[]
): Promise<boolean[]> => {
  const results = await Promise.all(
    permissions.map(({ resource, permission = "read" }) =>
      checkPermission(resource, permission)
    )
  );
  return results;
};
