import SpiceDBTest from "@/components/SpiceDBTest";
import UserInfo from "@/components/UserInfo";
import { getCurrentUserId } from "@/lib/auth";
import { NextPage } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

interface System {
  ID: string;
  Name: string;
  Note?: string;
}

const SpicedbSystemPage: NextPage = () => {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setLoading(true);
        const userId = getCurrentUserId();
        const response = await fetch(
          "http://localhost:3004/api/spicedb/system/all",
          {
            headers: {
              "X-User-ID": userId,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        setSystems(data);
        setError(null);
      } catch (err) {
        console.error("システム一覧の取得に失敗しました:", err);
        setError(
          err instanceof Error
            ? err.message
            : "システム一覧の取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSystems();
  }, []);

  return (
    <>
      <UserInfo />
      <div>
        <div>
          <h1>SpiceDB System List</h1>
        </div>

        {/* SpiceDBテストコンポーネント */}
        <SpiceDBTest />

        {loading && <p>読み込み中...</p>}

        {error && (
          <div style={{ color: "red", margin: "10px 0" }}>エラー: {error}</div>
        )}

        {!loading && !error && (
          <div>
            <h2>システム一覧 ({systems.length}件)</h2>

            {systems.length === 0 ? (
              <p>システムが見つかりませんでした。</p>
            ) : (
              <div style={{ marginTop: "20px" }}>
                {systems.map((system) => (
                  <div
                    key={system.ID}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "16px",
                      marginBottom: "12px",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <h3>{system.Name}</h3>
                    <p>
                      <strong>ID:</strong> {system.ID}
                    </p>
                    {system.Note && (
                      <p>
                        <strong>説明:</strong> {system.Note}
                      </p>
                    )}
                    <div style={{ marginTop: "12px" }}>
                      <Link href={`/spicedb/system/${system.ID}`}>
                        <button
                          style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                            marginRight: "8px",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#0056b3";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#007bff";
                          }}
                        >
                          詳細を見る
                        </button>
                      </Link>
                      <a
                        href={`http://localhost:3000/spicedb/system/${system.ID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button
                          style={{
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#1e7e34";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#28a745";
                          }}
                        >
                          AWSアカウント一覧
                        </button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SpicedbSystemPage;
