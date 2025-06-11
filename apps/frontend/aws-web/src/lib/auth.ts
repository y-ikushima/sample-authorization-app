import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

/**
 * 現在認証されているユーザーIDを取得する
 * 環境変数AUTHENTICATED_USER_IDから値を取得し、
 * 設定されていない場合はデフォルト値を返す
 */
export const getCurrentUserId = (): string => {
  // サーバーサイドでは process.env から直接取得
  if (typeof window === "undefined") {
    return process.env.AUTHENTICATED_USER_ID || "user-123";
  }

  // クライアントサイドでは publicRuntimeConfig から取得
  return publicRuntimeConfig?.authenticatedUserId || "user-123";
};

/**
 * 擬似的な認証状態を管理するクラス
 */
export class AuthManager {
  private static instance: AuthManager;
  private userId: string;

  private constructor() {
    this.userId = getCurrentUserId();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public getUserId(): string {
    return this.userId;
  }

  public isAuthenticated(): boolean {
    return !!this.userId;
  }

  /**
   * ログイン状態を擬似的に更新する（開発用）
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }
}

// 便利な関数のエクスポート
export const auth = AuthManager.getInstance();
export const USER_ID = getCurrentUserId();
