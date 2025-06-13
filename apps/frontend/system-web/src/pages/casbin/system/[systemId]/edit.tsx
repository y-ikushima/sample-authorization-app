import { ProtectedRoute } from "@/components/ProtectedRoute";
import UserInfo from "@/components/UserInfo";
import { getCurrentUserId } from "@/lib/auth";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface System {
  ID: string;
  Name: string;
  Note?: string;
}

const SystemEditPage: NextPage = () => {
  const router = useRouter();
  const { systemId } = router.query;
  const [system, setSystem] = useState<System | null>(null);
  const [formData, setFormData] = useState({
    Name: "",
    Note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!systemId) return;

    const fetchSystem = async () => {
      try {
        setLoading(true);
        const userId = getCurrentUserId();
        const response = await fetch(
          `http://localhost:3004/api/casbin/system/${systemId}`,
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
        setSystem(data);
        setFormData({
          Name: data.Name || "",
          Note: data.Note || "",
        });
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemId) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      const userId = getCurrentUserId();
      const response = await fetch(
        `http://localhost:3004/api/casbin/system/${systemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": userId,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }

      setSaveSuccess(true);
      setError(null);

      // 成功メッセージを表示後、詳細ページに戻る
      setTimeout(() => {
        router.push(`/casbin/system/${systemId}`);
      }, 1500);
    } catch (err) {
      console.error("システムの更新に失敗しました:", err);
      setError(
        err instanceof Error ? err.message : "システムの更新に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  // systemIdが取得できるまで何も表示しない
  if (!systemId || Array.isArray(systemId)) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <UserInfo />
      <ProtectedRoute resource={`/system/${systemId}`} action="PUT">
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
                ← 詳細に戻る
              </button>
            </Link>
            <h1>システム編集</h1>
          </div>

          {loading && <p>読み込み中...</p>}

          {error && (
            <div style={{ color: "red", margin: "10px 0" }}>
              エラー: {error}
            </div>
          )}

          {saving && (
            <div style={{ color: "blue", margin: "10px 0" }}>保存中...</div>
          )}

          {saveSuccess && (
            <div style={{ color: "green", margin: "10px 0" }}>
              保存が完了しました。詳細ページに戻ります...
            </div>
          )}

          {!loading && system && (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "24px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ID:
                  </label>
                  <input
                    type="text"
                    value={system.ID}
                    disabled
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: "#e9ecef",
                      color: "#6c757d",
                    }}
                  />
                  <small style={{ color: "#6c757d" }}>IDは変更できません</small>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    システム名: <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="Name"
                    value={formData.Name}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    説明:
                  </label>
                  <textarea
                    name="Note"
                    value={formData.Note}
                    onChange={handleInputChange}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      backgroundColor: saving ? "#6c757d" : "#007bff",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                      fontSize: "16px",
                    }}
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/casbin/system/${systemId}`)}
                    style={{
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </form>
          )}

          {!loading && !system && (
            <div>
              <p>システムが見つかりませんでした。</p>
            </div>
          )}
        </div>
      </ProtectedRoute>
    </>
  );
};

export default SystemEditPage;
