import { getCurrentUserId } from "./auth";

// Next.jsのAPIルートを使用（CORSエラー回避のため）
const SPICEDB_API_BASE = "/api/spicedb";

/**
 * SpiceDBサービスに送信するリクエスト型
 */
interface AuthRequest {
  subject: string;
  resource: string;
  permission: string;
}

/**
 * SpiceDBサービスからのレスポンス型
 */
interface AuthResponse {
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

    const authRequest: AuthRequest = {
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

    const authResponse: AuthResponse = await response.json();

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
 * ユーザーが特定のシステムにアクセス可能かチェックする
 */
export const checkSystemAccess = async (
  systemId: string,
  permission: string = "read"
): Promise<boolean> => {
  return await checkPermission(`system:${systemId}`, permission);
};

/**
 * システムの編集権限をチェックする
 */
export const checkSystemEditPermission = async (
  systemId: string
): Promise<boolean> => {
  return await checkPermission(`system:${systemId}`, "write");
};

/**
 * システムのメンバー管理権限をチェックする
 */
export const checkSystemMemberManagePermission = async (
  systemId: string
): Promise<boolean> => {
  return await checkPermission(`system:${systemId}`, "manage_members");
};

/**
 * システムの削除権限をチェックする
 */
export const checkSystemDeletePermission = async (
  systemId: string
): Promise<boolean> => {
  return await checkPermission(`system:${systemId}`, "delete");
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

/**
 * リレーションシップの型定義
 */
interface Relationship {
  resource: string;
  relation: string;
  subject: string;
}

/**
 * リレーションシップを取得する
 */
export const getRelationships = async (): Promise<{
  relationships: Relationship[];
}> => {
  try {
    const response = await fetch(`${SPICEDB_API_BASE}/relationships`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`SpiceDBサービスエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("リレーションシップ取得エラー:", error);
    throw error;
  }
};
