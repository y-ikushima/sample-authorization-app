import UserInfo from "@/components/UserInfo";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

// AWSアカウントユーザー情報の型定義
interface AwsUserInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  aws_account_id: string;
  aws_account_name: string;
}

const AwsAccountMemberPage: React.FC = () => {
  const router = useRouter();
  const { accountId } = router.query;

  const [awsUsers, setAwsUsers] = useState<AwsUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const fetchAwsAccountUsers = async () => {
      try {
        setLoading(true);

        // AWSアカウントに所属するユーザー一覧を取得
        const usersResponse = await fetch(
          `http://localhost:3003/api/casbin/account/${accountId}/users`
        );
        if (!usersResponse.ok) {
          throw new Error("ユーザー情報の取得に失敗しました");
        }
        const usersData = await usersResponse.json();
        setAwsUsers(usersData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAwsAccountUsers();
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

  return (
    <>
      <Head>
        <title>AWSアカウントメンバー一覧</title>
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
          <h1>AWSアカウントメンバー一覧</h1>
          <p>AWSアカウント {accountId} に所属するユーザーの一覧です</p>
        </div>

        {/* ユーザー一覧 */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "16px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h2>所属ユーザー ({awsUsers.length}人)</h2>

          {awsUsers.length === 0 ? (
            <p>このAWSアカウントに所属するユーザーはいません</p>
          ) : (
            <div style={{ marginTop: "20px" }}>
              {awsUsers.map((user) => (
                <div
                  key={user.user_id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    padding: "16px",
                    marginBottom: "12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <h3>{user.user_name}</h3>
                  <p>
                    <strong>ユーザーID:</strong> {user.user_id}
                  </p>
                  <p>
                    <strong>メールアドレス:</strong> {user.user_email}
                  </p>
                  <p>
                    <strong>AWSアカウントID:</strong> {user.aws_account_id}
                  </p>
                  <p>
                    <strong>AWSアカウント名:</strong> {user.aws_account_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AwsAccountMemberPage;
