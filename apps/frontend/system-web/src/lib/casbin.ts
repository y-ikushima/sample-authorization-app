import { getCurrentUserId } from "./auth";

// Next.jsのAPIルートを使用（CORSエラー回避のため）
const CASBIN_API_BASE = "/api/casbin";

/**
 * バックエンドのCasbinサービスに送信するリクエスト型
 */
interface AuthRequest {
  subject: string;
  object: string;
  action: string;
}

/**
 * バックエンドのCasbinサービスからのレスポンス型
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
  action: string = "GET"
): Promise<boolean> => {
  try {
    const userId = getCurrentUserId();

    const authRequest: AuthRequest = {
      subject: userId,
      object: resource,
      action: action,
    };

    console.log(
      `権限チェック開始: user=${userId}, resource=${resource}, action=${action}`
    );

    const response = await fetch(`${CASBIN_API_BASE}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authRequest),
    });

    if (!response.ok) {
      console.error(
        `Casbinサービスエラー: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const authResponse: AuthResponse = await response.json();

    console.log(
      `権限チェック結果: user=${userId}, resource=${resource}, action=${action}, allowed=${authResponse.allowed}`
    );

    if (!authResponse.allowed && authResponse.reason) {
      console.log(`アクセス拒否理由: ${authResponse.reason}`);
    }

    return authResponse.allowed;
  } catch (error) {
    console.error("権限チェックエラー:", error);
    return false;
  }
};

/**
 * ユーザーが特定のシステムにアクセス可能かチェックする
 */
export const checkSystemAccess = async (
  systemId: string,
  action: string = "GET"
): Promise<boolean> => {
  return await checkPermission(`/system/${systemId}`, action);
};

/**
 * システムの編集権限をチェックする
 */
export const checkSystemEditPermission = async (
  systemId: string
): Promise<boolean> => {
  return await checkPermission(`/system/${systemId}`, "PUT");
};

/**
 * システムのメンバー閲覧権限をチェックする
 */
export const checkSystemMemberViewPermission = async (
  systemId: string
): Promise<boolean> => {
  return await checkPermission(`/system/${systemId}/members`, "GET");
};

/**
 * ページアクセス制御用のPermission型
 */
export interface Permission {
  resource: string;
  action?: string;
}

/**
 * 複数の権限をチェックする
 */
export const checkMultiplePermissions = async (
  permissions: Permission[]
): Promise<boolean[]> => {
  const results = await Promise.all(
    permissions.map(({ resource, action = "GET" }) =>
      checkPermission(resource, action)
    )
  );
  return results;
};

/**
 * バックエンドのCasbinサービスからポリシー一覧を取得する
 */
export const getPolicies = async (): Promise<string[][]> => {
  try {
    const response = await fetch(`${CASBIN_API_BASE}/policies`);

    if (!response.ok) {
      throw new Error(`Failed to fetch policies: ${response.status}`);
    }

    const data = await response.json();
    return data.policies || [];
  } catch (error) {
    console.error("ポリシー取得エラー:", error);
    return [];
  }
};
