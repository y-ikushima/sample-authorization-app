import UserInfo from "@/components/UserInfo";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

// AWSアカウントの型定義
interface AwsAccount {
  ID: string;
  Name: string;
  Note: string;
}

const AwsAccountEditPage: React.FC = () => {
  const router = useRouter();
  const { systemId, accountId } = router.query;

  const [awsAccount, setAwsAccount] = useState<AwsAccount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const fetchAwsAccountDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // AWSアカウント詳細を取得
        const accountResponse = await fetch(
          `http://localhost:3003/api/opa/account/${accountId}`
        );
        if (!accountResponse.ok) {
          throw new Error("AWSアカウント情報の取得に失敗しました");
        }
        const accountData = await accountResponse.json();
        setAwsAccount(accountData);
        setFormData({
          name: accountData.Name || "",
          note: accountData.Note || "",
        });
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!accountId) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3003/api/opa/account/${accountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Name: formData.name,
            Note: formData.note,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AWSアカウント情報の更新に失敗しました");
      }

      // 保存成功後、詳細ページに戻る
      router.push(`/opa/system/${systemId}/account/${accountId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/opa/system/${systemId}/account/${accountId}`);
  };

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

  if (error && !awsAccount) {
    return (
      <>
        <UserInfo />
        <div>
          <div style={{ color: "red", margin: "10px 0" }}>エラー: {error}</div>
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
            }}
          >
            ← 戻る
          </button>
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
            }}
          >
            ← 戻る
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>AWSアカウント編集 - {awsAccount.Name}</title>
      </Head>
      <UserInfo />
      <div>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={handleCancel}
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
          <h1>AWSアカウント編集</h1>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div
            style={{
              color: "red",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              padding: "12px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* 編集フォーム */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "20px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h2>アカウント情報編集</h2>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              アカウントID（変更不可）
            </label>
            <input
              type="text"
              value={awsAccount.ID}
              disabled
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                backgroundColor: "#e9ecef",
                color: "#6c757d",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              アカウント名 <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              備考
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows={4}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            style={{
              backgroundColor:
                saving || !formData.name.trim() ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor:
                saving || !formData.name.trim() ? "not-allowed" : "pointer",
              fontSize: "14px",
              marginRight: "8px",
            }}
            onMouseOver={(e) => {
              if (!saving && formData.name.trim()) {
                e.currentTarget.style.backgroundColor = "#1e7e34";
              }
            }}
            onMouseOut={(e) => {
              if (!saving && formData.name.trim()) {
                e.currentTarget.style.backgroundColor = "#28a745";
              }
            }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = "#5a6268";
              }
            }}
            onMouseOut={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = "#6c757d";
              }
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
};

export default AwsAccountEditPage;
