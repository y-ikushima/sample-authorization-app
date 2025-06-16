import { ProtectedRoute } from "@/components/ProtectedRoute";
import UserInfo from "@/components/UserInfo";
import { getCurrentUserId } from "@/lib/auth";
import { getUserRoles, updateUserRole } from "@/lib/casbin";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface SystemUserInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  system_id: string;
  roles?: string[];
}

// 利用可能なロール一覧（システム管理者が設定可能）
const getAvailableRoles = (systemId: string) => [
  { value: "", label: "ロールなし" },
  { value: `system_owner:${systemId}`, label: "システムオーナー" },
  { value: `system_manager:${systemId}`, label: "システムマネージャー" },
  { value: `system_staff:${systemId}`, label: "システムスタッフ" },
  { value: "admin", label: "グローバル管理者" },
  { value: "editor", label: "編集者" },
  { value: "viewer", label: "閲覧者" },
  { value: "operator", label: "操作者" },
];

// ロール表示名を取得する関数
const getRoleDisplayName = (role: string, systemId: string): string => {
  if (role === `system_owner:${systemId}`) return "システムオーナー";
  if (role === `system_manager:${systemId}`) return "システムマネージャー";
  if (role === `system_staff:${systemId}`) return "システムスタッフ";
  if (role === "admin") return "グローバル管理者";
  if (role === "editor") return "編集者";
  if (role === "viewer") return "閲覧者";
  if (role === "operator") return "操作者";
  return role; // 未知のロールはそのまま表示
};

const SystemMemberPage: NextPage = () => {
  const router = useRouter();
  const { systemId } = router.query;
  const [members, setMembers] = useState<SystemUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string>("");
  const [rolesLoading, setRolesLoading] = useState<Record<string, boolean>>({});
  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({});

  // ユーザのロールを取得する関数
  const fetchUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const roles = await getUserRoles(userId);
      return roles;
    } catch (error) {
      console.error(`Failed to fetch roles for user ${userId}:`, error);
      return [];
    }
  };

  // 全ユーザのロールを一括取得する関数
  const fetchAllUserRoles = async (userIds: string[]) => {
    setRolesLoading((prev) => {
      const newState = { ...prev };
      userIds.forEach((id) => (newState[id] = true));
      return newState;
    });

    try {
      const rolePromises = userIds.map((userId) => fetchUserRoles(userId));
      const roleResults = await Promise.all(rolePromises);

      const rolesMap: Record<string, string[]> = {};
      userIds.forEach((userId, index) => {
        rolesMap[userId] = roleResults[index];
      });

      // メンバー情報を更新
      setMembers((prevMembers) =>
        prevMembers.map((member) => ({
          ...member,
          roles: rolesMap[member.user_id] || [],
        }))
      );
    } catch (error) {
      console.error("Failed to fetch user roles:", error);
    } finally {
      setRolesLoading((prev) => {
        const newState = { ...prev };
        userIds.forEach((id) => (newState[id] = false));
        return newState;
      });
    }
  };

  // ユーザのロールを更新する関数
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    const member = members.find((m) => m.user_id === userId);
    if (!member) return;

    // システム関連のロールのみ更新対象とする（グローバル管理者ロール等は保持）
    const currentSystemRole =
      member.roles?.find(
        (role) =>
          role.startsWith(`system_owner:${systemId}`) ||
          role.startsWith(`system_manager:${systemId}`) ||
          role.startsWith(`system_staff:${systemId}`)
      ) || "";

    // 同じロールの場合は何もしない
    if (currentSystemRole === newRole) return;

    setRoleUpdating((prev) => ({ ...prev, [userId]: true }));

    try {
      const success = await updateUserRole(userId, currentSystemRole, newRole);

      if (success) {
        // 成功時はローカルステートを更新
        setMembers((prevMembers) =>
          prevMembers.map((m) => {
            if (m.user_id === userId) {
              // 既存のロールからシステム固有のロールを除去し、新しいロールを追加
              const otherRoles = (m.roles || []).filter(
                (role) =>
                  !role.startsWith(`system_owner:${systemId}`) &&
                  !role.startsWith(`system_manager:${systemId}`) &&
                  !role.startsWith(`system_staff:${systemId}`)
              );
              const newRoles = newRole ? [...otherRoles, newRole] : otherRoles;
              return { ...m, roles: newRoles };
            }
            return m;
          })
        );
        console.log(
          `Successfully updated role for user ${userId}: ${currentSystemRole} -> ${newRole}`
        );
      } else {
        console.error(`Failed to update role for user ${userId}`);
        alert("ロールの更新に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("Role update error:", error);
      alert("ロールの更新中にエラーが発生しました。");
    } finally {
      setRoleUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    if (!systemId) return;

    const fetchMembers = async () => {
      try {
        setLoading(true);

        const userId = getCurrentUserId();

        // システム情報を取得（システム名表示用）
        const systemResponse = await fetch(
          `http://localhost:3004/api/casbin/system/${systemId}`,
          {
            headers: {
              "X-User-ID": userId,
            },
          }
        );

        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          setSystemName(systemData.Name || "");
        }

        // メンバー一覧を取得
        const membersResponse = await fetch(
          `http://localhost:3004/api/casbin/system/${systemId}/users`,
          {
            headers: {
              "X-User-ID": userId,
            },
          }
        );

        if (!membersResponse.ok) {
          throw new Error(`HTTPエラー: ${membersResponse.status}`);
        }

        const membersData = await membersResponse.json();
        setMembers(membersData);
        setError(null);

        // メンバー取得後、各ユーザのロールを取得
        const userIds = membersData.map(
          (member: SystemUserInfo) => member.user_id
        );
        if (userIds.length > 0) {
          await fetchAllUserRoles(userIds);
        }
      } catch (err) {
        console.error("メンバー一覧の取得に失敗しました:", err);
        setError(
          err instanceof Error
            ? err.message
            : "メンバー一覧の取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [systemId]);

  // systemIdが取得できるまで何も表示しない
  if (!systemId || Array.isArray(systemId)) {
    return <div>Loading...</div>;
  }

  const availableRoles = getAvailableRoles(systemId as string);

  return (
    <>
      <UserInfo />
      <ProtectedRoute resource={`/system/${systemId}/members`} action="GET">
        <div>
          <div style={{ marginBottom: "20px" }}>
            <Link href={`/casbin/system/${systemId}`}>
              <button
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  marginRight: "10px",
                }}
              >
                ← システム詳細に戻る
              </button>
            </Link>
            <h1>
              {systemName ? `${systemName} - メンバー一覧` : "メンバー一覧"}
            </h1>
          </div>

          {loading && <p>読み込み中...</p>}

          {error && (
            <div style={{ color: "red", margin: "10px 0" }}>
              エラー: {error}
            </div>
          )}

          {!loading && !error && (
            <div>
              <h2>メンバー一覧 ({members.length}人)</h2>

              {members.length === 0 ? (
                <p>メンバーが見つかりませんでした。</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    marginTop: "20px",
                  }}
                >
                  {members.map((member, index) => {
                    // このシステムに関連するロールを取得
                    const systemRole =
                      member.roles?.find(
                        (role) =>
                          role.startsWith(`system_owner:${systemId}`) ||
                          role.startsWith(`system_manager:${systemId}`) ||
                          role.startsWith(`system_staff:${systemId}`)
                      ) || "";

                    return (
                      <div
                        key={`${member.user_id}-${index}`}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "20px",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <div style={{ marginBottom: "16px" }}>
                          <h3
                            style={{
                              margin: "0 0 8px 0",
                              color: "#333",
                              fontSize: "18px",
                            }}
                          >
                            {member.user_name}
                          </h3>
                          <p
                            style={{
                              margin: "0 0 8px 0",
                              color: "#666",
                              fontSize: "14px",
                            }}
                          >
                            {member.user_email}
                          </p>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "12px",
                              color: "#888",
                            }}
                          >
                            <strong>ユーザーID:</strong> {member.user_id}
                          </p>
                        </div>

                        {/* ロール管理セクション */}
                        <div
                          style={{
                            borderTop: "1px solid #eee",
                            paddingTop: "16px",
                          }}
                        >
                          <div style={{ marginBottom: "8px" }}>
                            <strong style={{ fontSize: "14px", color: "#333" }}>
                              システムロール:
                            </strong>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {rolesLoading[member.user_id] ? (
                              <span style={{ fontSize: "12px", color: "#666" }}>
                                ロール読み込み中...
                              </span>
                            ) : (
                              <>
                                <select
                                  value={systemRole}
                                  onChange={(e) =>
                                    handleRoleUpdate(
                                      member.user_id,
                                      e.target.value
                                    )
                                  }
                                  disabled={roleUpdating[member.user_id]}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                    fontSize: "14px",
                                    backgroundColor: roleUpdating[
                                      member.user_id
                                    ]
                                      ? "#f8f9fa"
                                      : "white",
                                  }}
                                >
                                  {availableRoles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                                {roleUpdating[member.user_id] && (
                                  <span
                                    style={{ fontSize: "12px", color: "#666" }}
                                  >
                                    更新中...
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {member.roles && member.roles.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              <span
                                style={{ fontSize: "12px", color: "#28a745" }}
                              >
                                現在のロール:{" "}
                                {member.roles
                                  .map((role) =>
                                    getRoleDisplayName(role, systemId as string)
                                  )
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  marginTop: "30px",
                  padding: "20px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                }}
              >
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                  メンバー管理
                </h3>
                <p
                  style={{
                    margin: "0 0 15px 0",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  メンバーの追加・削除は管理者にお問い合わせください。
                  システムロールの変更は上記のセレクトボックスから行えます。
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    style={{
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => {
                      // 将来的にメンバー追加機能を実装
                      alert("メンバー追加機能は今後実装予定です");
                    }}
                  >
                    メンバー追加
                  </button>
                  <button
                    style={{
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => {
                      window.location.reload();
                    }}
                  >
                    更新
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ProtectedRoute>
    </>
  );
};

export default SystemMemberPage;
