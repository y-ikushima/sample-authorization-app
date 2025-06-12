import UserInfo from "@/components/UserInfo";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

// AWSアカウントの型定義（バックエンドのレスポンス構造に合わせる）
interface AwsAccount {
  ID: string;
  Name: string;
  Note: string;
}

const AwsAccountDetailPage: React.FC = () => {
  const router = useRouter();
  const { systemId, accountId } = router.query;

  const [awsAccount, setAwsAccount] = useState<AwsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const fetchAwsAccountDetails = async () => {
      try {
        setLoading(true);

        // AWSアカウント詳細を取得
        const accountResponse = await fetch(
          `http://localhost:3003/api/casbin/account/${accountId}`
        );
        if (!accountResponse.ok) {
          throw new Error("AWSアカウント情報の取得に失敗しました");
        }
        const accountData = await accountResponse.json();
        setAwsAccount(accountData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAwsAccountDetails();
  }, [accountId]);

  if (loading) {
    return (
      <>
        <UserInfo />
        <div>
          <p>読み込み中...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <UserInfo />
        <div>
          <div style={{ color: "red", margin: "10px 0" }}>エラー: {error}</div>
        </div>
      </>
    );
  }

  if (!awsAccount) {
    return (
      <>
        <UserInfo />
        <div>
          <p>AWSアカウントが見つかりません</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>AWSアカウント詳細 - {awsAccount.Name}</title>
      </Head>
      <UserInfo />
      <div>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => router.back()}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              marginBottom: "10px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#5a6268";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#6c757d";
            }}
          >
            ← 戻る
          </button>
          <h1>AWSアカウント詳細</h1>
        </div>

        {/* AWSアカウント情報 */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "20px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h2>アカウント情報</h2>
          <p>
            <strong>アカウントID:</strong> {awsAccount.ID}
          </p>
          <p>
            <strong>アカウント名:</strong> {awsAccount.Name}
          </p>
          {awsAccount.Note && (
            <p>
              <strong>備考:</strong> {awsAccount.Note}
            </p>
          )}
        </div>

        {/* アクションボタン */}
        <div style={{ marginTop: "20px" }}>
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
            onClick={() =>
              router.push(
                `/casbin/system/${systemId}/account/${accountId}/edit`
              )
            }
          >
            編集
          </button>
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
            onClick={() =>
              router.push(
                `/casbin/system/${systemId}/account/${accountId}/member`
              )
            }
          >
            メンバー管理
          </button>
        </div>
      </div>
    </>
  );
};

export default AwsAccountDetailPage;
