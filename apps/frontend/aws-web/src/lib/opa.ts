import { getCurrentUserId } from "./auth";

// Next.jsのAPIルートを使用（CORSエラー回避のため）
const OPA_API_BASE = "/api/opa";

/**
 * バックエンドのOPAサービスに送信するリクエスト型
 */
interface OPAAuthRequest {
  subject: string;
  resource: string;
  permission: string;
}

/**
 * バックエンドのOPAサービスからのレスポンス型
 */
interface OPAAuthResponse {
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

    const authRequest: OPAAuthRequest = {
      subject: userId,
      resource: resource,
      permission: permission,
    };

    console.log(
      `OPA権限チェック開始: user=${userId}, resource=${resource}, permission=${permission}`
    );

    const response = await fetch(`${OPA_API_BASE}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authRequest),
    });

    if (!response.ok) {
      console.error(
        `OPAサービスエラー: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const authResponse: OPAAuthResponse = await response.json();

    console.log(
      `OPA権限チェック結果: user=${userId}, resource=${resource}, permission=${permission}, allowed=${authResponse.allowed}`
    );

    if (!authResponse.allowed && authResponse.reason) {
      console.log(`アクセス拒否理由: ${authResponse.reason}`);
    }

    return authResponse.allowed;
  } catch (error) {
    console.error("OPA権限チェックエラー:", error);
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
 * OPAユーザー型
 */
interface OPAUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * OPAリソース型
 */
interface OPAResource {
  id: string;
  name: string;
  type: string;
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
 * バックエンドのOPAサービスからユーザー情報を取得する
 */
export const getOPAUsers = async (): Promise<OPAUser[]> => {
  try {
    const response = await fetch(`${OPA_API_BASE}/users`);

    if (!response.ok) {
      throw new Error(`Failed to fetch OPA users: ${response.status}`);
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error("OPAユーザー取得エラー:", error);
    return [];
  }
};

/**
 * バックエンドのOPAサービスからリソース情報を取得する
 */
export const getOPAResources = async (): Promise<OPAResource[]> => {
  try {
    const response = await fetch(`${OPA_API_BASE}/resources`);

    if (!response.ok) {
      throw new Error(`Failed to fetch OPA resources: ${response.status}`);
    }

    const data = await response.json();
    return data.resources || [];
  } catch (error) {
    console.error("OPAリソース取得エラー:", error);
    return [];
  }
};

/**
 * OPAポリシー評価エンドポイントでカスタムクエリを実行する
 */
export const evaluateOPAQuery = async (
  query: string,
  input: Record<string, unknown>
): Promise<unknown> => {
  try {
    const response = await fetch(`${OPA_API_BASE}/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, input }),
    });

    if (!response.ok) {
      throw new Error(`Failed to evaluate OPA query: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("OPAクエリ評価エラー:", error);
    return null;
  }
};
