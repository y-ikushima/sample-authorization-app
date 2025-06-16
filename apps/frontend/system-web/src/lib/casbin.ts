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

// ロール管理用の型を追加
interface UserRolesResponse {
  user: string;
  roles: string[];
}

interface RoleUpdateRequest {
  user: string;
  role: string;
}

interface RoleUpdateResponse {
  added?: boolean;
  removed?: boolean;
  user: string;
  role: string;
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

/**
 * Casbinの認可チェックを行う
 */
export async function checkAuthorization(
  subject: string,
  object: string,
  action: string
): Promise<boolean> {
  try {
    const authRequest: AuthRequest = {
      subject,
      object,
      action,
    };

    console.log("Making authorization request:", authRequest);

    const response = await fetch(`${CASBIN_API_BASE}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authRequest),
    });

    if (!response.ok) {
      console.error("Authorization request failed:", response.status);
      return false;
    }

    const result: AuthResponse = await response.json();
    console.log("Authorization result:", result);

    return result.allowed;
  } catch (error) {
    console.error("Authorization check error:", error);
    return false;
  }
}

/**
 * ユーザのロール一覧を取得する
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${CASBIN_API_BASE}/user-roles?user=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Get user roles request failed:", response.status);
      return [];
    }

    const result: UserRolesResponse = await response.json();
    return result.roles || [];
  } catch (error) {
    console.error("Get user roles error:", error);
    return [];
  }
}

/**
 * ユーザにロールを追加する
 */
export async function addRoleToUser(
  userId: string,
  role: string
): Promise<boolean> {
  try {
    const roleRequest: RoleUpdateRequest = {
      user: userId,
      role: role,
    };

    const response = await fetch(`${CASBIN_API_BASE}/add-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roleRequest),
    });

    if (!response.ok) {
      console.error("Add role request failed:", response.status);
      return false;
    }

    const result: RoleUpdateResponse = await response.json();
    return result.added === true;
  } catch (error) {
    console.error("Add role error:", error);
    return false;
  }
}

/**
 * ユーザからロールを削除する
 */
export async function removeRoleFromUser(
  userId: string,
  role: string
): Promise<boolean> {
  try {
    const roleRequest: RoleUpdateRequest = {
      user: userId,
      role: role,
    };

    const response = await fetch(`${CASBIN_API_BASE}/remove-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roleRequest),
    });

    if (!response.ok) {
      console.error("Remove role request failed:", response.status);
      return false;
    }

    const result: RoleUpdateResponse = await response.json();
    return result.removed === true;
  } catch (error) {
    console.error("Remove role error:", error);
    return false;
  }
}

/**
 * ユーザのロールを更新する（既存のロールを削除して新しいロールを追加）
 */
export async function updateUserRole(
  userId: string,
  oldRole: string,
  newRole: string
): Promise<boolean> {
  try {
    // 新しいロールが既存のロールと同じ場合は何もしない
    if (oldRole === newRole) {
      return true;
    }

    // 既存のロールがある場合は削除
    if (oldRole && oldRole !== "") {
      const removed = await removeRoleFromUser(userId, oldRole);
      if (!removed) {
        console.error("Failed to remove old role:", oldRole);
        return false;
      }
    }

    // 新しいロールを追加
    if (newRole && newRole !== "") {
      const added = await addRoleToUser(userId, newRole);
      if (!added) {
        console.error("Failed to add new role:", newRole);
        // 失敗した場合は元のロールを復元を試行
        if (oldRole && oldRole !== "") {
          await addRoleToUser(userId, oldRole);
        }
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Update user role error:", error);
    return false;
  }
}
