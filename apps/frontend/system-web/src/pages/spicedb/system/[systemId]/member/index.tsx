import {
  SpiceDBProtectedButton,
  SpiceDBProtectedRoute,
} from "@/components/SpiceDBProtectedRoute";
import UserInfo from "@/components/UserInfo";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface SystemUserInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  system_id: string;
}

const SpiceDBSystemMemberPage: NextPage = () => {
  const router = useRouter();
  const { systemId } = router.query;
  const [members, setMembers] = useState<SystemUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string>("");

  useEffect(() => {
    if (!systemId) return;

    const fetchMembers = async () => {
      try {
        setLoading(true);

        // システム情報を取得（システム名表示用）
        const systemResponse = await fetch(
          `http://localhost:3004/api/spicedb/system/${systemId}`
        );

        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          setSystemName(systemData.Name || "");
        }

        // メンバー一覧を取得
        const membersResponse = await fetch(
          `http://localhost:3004/api/spicedb/system/${systemId}/users`
        );

        if (!membersResponse.ok) {
          throw new Error(`HTTPエラー: ${membersResponse.status}`);
        }

        const membersData = await membersResponse.json();
        setMembers(membersData);
        setError(null);
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

  return (
    <>
      <UserInfo />
      <SpiceDBProtectedRoute resource={`system:${systemId}`} permission="read">
        <div>
          <div style={{ marginBottom: "20px" }}>
            <Link href={`/spicedb/system/${systemId}`}>
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
              {systemName
                ? `${systemName} - SpiceDB メンバー一覧`
                : "SpiceDB メンバー一覧"}
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
                  {members.map((member, index) => (
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
                      <div style={{ marginBottom: "12px" }}>
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
                            margin: "0",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          {member.user_email}
                        </p>
                      </div>
                      <div
                        style={{
                          borderTop: "1px solid #eee",
                          paddingTop: "12px",
                        }}
                      >
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
                    </div>
                  ))}
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
                  SpiceDB メンバー管理
                </h3>
                <p
                  style={{
                    margin: "0 0 15px 0",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  SpiceDBのリレーションシップベースでメンバー管理が行われます。メンバーの追加・削除はオーナー権限が必要です。
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <SpiceDBProtectedButton
                    resource={`system:${systemId}`}
                    permission="manage_members"
                    onClick={() => {
                      alert("メンバー追加機能は開発中です");
                    }}
                    style={{
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    メンバーを追加
                  </SpiceDBProtectedButton>
                  <SpiceDBProtectedButton
                    resource={`system:${systemId}`}
                    permission="manage_members"
                    onClick={() => {
                      alert("メンバー削除機能は開発中です");
                    }}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    メンバーを削除
                  </SpiceDBProtectedButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </SpiceDBProtectedRoute>
    </>
  );
};

export default SpiceDBSystemMemberPage;
