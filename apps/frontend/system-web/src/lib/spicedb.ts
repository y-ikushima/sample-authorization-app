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

// SpiceDBのロール管理用の型を追加
interface UserRelationship {
  resource: string;
  relation: string;
}

interface UserRolesResponse {
  user: string;
  relationships: UserRelationship[];
}

interface RelationshipRequest {
  resource: string;
  relation: string;
  subject: string;
}

interface RelationshipResponse {
  added?: boolean;
  removed?: boolean;
  relationship: RelationshipRequest;
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

/**
 * ユーザのロール（リレーションシップ）一覧を取得する
 */
export async function getUserRoles(
  userId: string,
  resource?: string
): Promise<UserRelationship[]> {
  try {
    // user:プレフィックスを追加
    const subject = userId.startsWith("user:") ? userId : `user:${userId}`;

    const params = new URLSearchParams({ user: subject });
    if (resource) {
      params.append("resource", resource);
    }

    const response = await fetch(
      `${SPICEDB_API_BASE}/user-roles?${params.toString()}`,
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
    return result.relationships || [];
  } catch (error) {
    console.error("Get user roles error:", error);
    return [];
  }
}

/**
 * ユーザにロール（リレーションシップ）を追加する
 */
export async function addUserRole(
  userId: string,
  resource: string,
  relation: string
): Promise<boolean> {
  try {
    // user:プレフィックスを追加
    const subject = userId.startsWith("user:") ? userId : `user:${userId}`;

    const relationshipRequest: RelationshipRequest = {
      resource: resource,
      relation: relation,
      subject: subject,
    };

    const response = await fetch(`${SPICEDB_API_BASE}/add-user-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(relationshipRequest),
    });

    if (!response.ok) {
      console.error("Add user role request failed:", response.status);
      return false;
    }

    const result: RelationshipResponse = await response.json();
    return result.added === true;
  } catch (error) {
    console.error("Add user role error:", error);
    return false;
  }
}

/**
 * ユーザからロール（リレーションシップ）を削除する
 */
export async function removeUserRole(
  userId: string,
  resource: string,
  relation: string
): Promise<boolean> {
  try {
    // user:プレフィックスを追加
    const subject = userId.startsWith("user:") ? userId : `user:${userId}`;

    const relationshipRequest: RelationshipRequest = {
      resource: resource,
      relation: relation,
      subject: subject,
    };

    const response = await fetch(`${SPICEDB_API_BASE}/remove-user-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(relationshipRequest),
    });

    if (!response.ok) {
      console.error("Remove user role request failed:", response.status);
      return false;
    }

    const result: RelationshipResponse = await response.json();
    return result.removed === true;
  } catch (error) {
    console.error("Remove user role error:", error);
    return false;
  }
}

/**
 * ユーザのロールを更新する（既存のロールを削除して新しいロールを追加）
 */
export async function updateUserRole(
  userId: string,
  resource: string,
  oldRelation: string,
  newRelation: string
): Promise<boolean> {
  try {
    // 新しいロールが既存のロールと同じ場合は何もしない
    if (oldRelation === newRelation) {
      return true;
    }

    // 既存のロールがある場合は削除
    if (oldRelation && oldRelation !== "") {
      const removed = await removeUserRole(userId, resource, oldRelation);
      if (!removed) {
        console.error("Failed to remove old role:", oldRelation);
        return false;
      }
    }

    // 新しいロールを追加
    if (newRelation && newRelation !== "") {
      const added = await addUserRole(userId, resource, newRelation);
      if (!added) {
        console.error("Failed to add new role:", newRelation);
        // 失敗した場合は元のロールを復元を試行
        if (oldRelation && oldRelation !== "") {
          await addUserRole(userId, resource, oldRelation);
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

/**
 * 特定のリソースに対するユーザのロールを取得する
 */
export async function getUserRoleForResource(
  userId: string,
  resource: string
): Promise<string> {
  try {
    const relationships = await getUserRoles(userId, resource);

    // 指定されたリソースに対する最初のリレーションシップを返す
    const relationship = relationships.find((rel) => rel.resource === resource);
    return relationship ? relationship.relation : "";
  } catch (error) {
    console.error("Get user role for resource error:", error);
    return "";
  }
}
