import {
  SpiceDBProtectedButton,
  SpiceDBProtectedRoute,
} from "@/components/SpiceDBProtectedRoute";
import UserInfo from "@/components/UserInfo";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface System {
  ID: string;
  Name: string;
  Note?: string;
}

const SpiceDBSystemDetailPage: NextPage = () => {
  const router = useRouter();
  const { systemId } = router.query;
  const [system, setSystem] = useState<System | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!systemId) return;

    const fetchSystem = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:3004/api/spicedb/system/${systemId}`
        );

        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        setSystem(data);
        setError(null);
      } catch (err) {
        console.error("システム詳細の取得に失敗しました:", err);
        setError(
          err instanceof Error
            ? err.message
            : "システム詳細の取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSystem();
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
            <Link href="/spicedb/system">
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
                ← 一覧に戻る
              </button>
            </Link>
            <h1>SpiceDB システム詳細</h1>
          </div>

          {loading && <p>読み込み中...</p>}

          {error && (
            <div style={{ color: "red", margin: "10px 0" }}>
              エラー: {error}
            </div>
          )}

          {!loading && !error && system && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "24px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2>{system.Name}</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                  <SpiceDBProtectedButton
                    resource={`system:${system.ID}`}
                    permission="read"
                    onClick={() =>
                      router.push(`/spicedb/system/${system.ID}/member`)
                    }
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
                    メンバー一覧
                  </SpiceDBProtectedButton>
                  <SpiceDBProtectedButton
                    resource={`system:${system.ID}`}
                    permission="write"
                    onClick={() =>
                      router.push(`/spicedb/system/${system.ID}/edit`)
                    }
                    style={{
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    編集
                  </SpiceDBProtectedButton>
                </div>
              </div>
              <div style={{ margin: "16px 0" }}>
                <p>
                  <strong>ID:</strong> {system.ID}
                </p>
                {system.Note && (
                  <p>
                    <strong>説明:</strong> {system.Note}
                  </p>
                )}
              </div>
            </div>
          )}

          {!loading && !error && !system && (
            <div>
              <p>システムが見つかりませんでした。</p>
            </div>
          )}
        </div>
      </SpiceDBProtectedRoute>
    </>
  );
};

export default SpiceDBSystemDetailPage;
