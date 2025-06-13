import UserInfo from "@/components/UserInfo";
import { useSystemAccess } from "@/hooks/useAccessControl";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface AwsAccount {
  ID: string;
  Name: string;
  Note: string;
  ID_2: string;
  AwsAccountID: string;
  SystemID: string;
}

export default function SpiceDBSystemAwsAccounts() {
  const router = useRouter();
  const { systemId } = router.query;
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // システムアクセス権限をチェック
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = useSystemAccess(systemId as string, "read", "spicedb");

  useEffect(() => {
    if (!systemId || typeof systemId !== "string") return;
    if (accessLoading) return; // 権限チェック中は待機
    if (!hasAccess) return; // アクセス権限がない場合は何もしない

    const fetchAwsAccounts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:3003/api/spicedb/account/system/${systemId}`
        );

        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        setAccounts(data);
        setError(null);
      } catch (err) {
        console.error("AWSアカウント一覧の取得に失敗しました:", err);
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAwsAccounts();
  }, [systemId, hasAccess, accessLoading]);

  // 権限チェック中の表示
  if (accessLoading) {
    return (
      <>
        <UserInfo />
        <div>
          <p>権限を確認中...</p>
        </div>
      </>
    );
  }

  // アクセス権限がない場合の表示
  if (!hasAccess) {
    return (
      <>
        <UserInfo />
        <div>
          <h1>アクセス拒否</h1>
          <p>このシステムにアクセスする権限がありません。</p>
          {accessError && (
            <div style={{ color: "red", margin: "10px 0" }}>
              エラー: {accessError}
            </div>
          )}
          <button
            onClick={() => router.back()}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            戻る
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <UserInfo />
      <div>
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h1>システム {systemId} のAWSアカウント一覧 (SpiceDB)</h1>
          </div>
          <p>このシステムに紐づくAWSアカウントを表示しています</p>
        </div>

        {loading && <p>読み込み中...</p>}

        {error && (
          <div style={{ color: "red", margin: "10px 0" }}>エラー: {error}</div>
        )}

        {!loading && !error && (
          <div>
            <h2>AWSアカウント ({accounts.length}件)</h2>

            {accounts.length === 0 ? (
              <p>このシステムに紐づくAWSアカウントが見つかりませんでした。</p>
            ) : (
              <div style={{ marginTop: "20px" }}>
                {accounts.map((account) => (
                  <div
                    key={account.ID}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "16px",
                      marginBottom: "12px",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <h3>{account.Name}</h3>
                    <p>
                      <strong>ID:</strong> {account.ID}
                    </p>
                    <p>
                      <strong>AWSアカウントID:</strong> {account.AwsAccountID}
                    </p>
                    {account.Note && (
                      <p>
                        <strong>説明:</strong> {account.Note}
                      </p>
                    )}
                    <p>
                      <strong>システムID:</strong> {account.SystemID}
                    </p>
                    <div style={{ marginTop: "12px" }}>
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
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "#0056b3";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "#007bff";
                        }}
                        onClick={() =>
                          router.push(
                            `/spicedb/system/${systemId}/account/${account.ID}`
                          )
                        }
                      >
                        詳細を見る
                      </button>
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
}
