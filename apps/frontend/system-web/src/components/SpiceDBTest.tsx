import { getCurrentUserId } from "@/lib/auth";
import { checkPermission, getRelationships } from "@/lib/spicedb";
import React, { useState } from "react";

const SpiceDBTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  interface Relationship {
    resource: string;
    relation: string;
    subject: string;
  }

  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const runTest = async (resource: string, permission: string) => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const result = await checkPermission(resource, permission);
      setTestResult(
        `テスト結果: ユーザー "${userId}" が "${resource}" への "${permission}" 権限 - ${
          result ? "許可" : "拒否"
        }`
      );
    } catch (error) {
      setTestResult(`エラー: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRelationships = async () => {
    setLoading(true);
    try {
      const relationshipsData = await getRelationships();
      setRelationships(relationshipsData.relationships);
    } catch (error) {
      console.error("リレーションシップ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        margin: "20px 0",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h3>SpiceDB権限チェックテスト</h3>
      <p>
        現在のユーザー: <strong>{getCurrentUserId()}</strong>
      </p>

      <div style={{ marginBottom: "20px" }}>
        <h4>テストケース</h4>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => runTest("system:system1", "read")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            system1 read
          </button>
          <button
            onClick={() => runTest("system:system1", "write")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            system1 write
          </button>
          <button
            onClick={() => runTest("system:system1", "manage_members")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#ffc107",
              color: "black",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            system1 manage_members
          </button>
          <button
            onClick={() => runTest("system:system2", "read")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            system2 read
          </button>
          <button
            onClick={() => runTest("aws:aws1", "read")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            aws1 read
          </button>
          <button
            onClick={() => runTest("aws:aws1", "write")}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: "#e83e8c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            aws1 write
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={loadRelationships}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          リレーションシップ一覧を取得
        </button>
      </div>

      {loading && <p>処理中...</p>}

      {testResult && (
        <div
          style={{
            padding: "10px",
            backgroundColor: testResult.includes("許可")
              ? "#d4edda"
              : "#f8d7da",
            color: testResult.includes("許可") ? "#155724" : "#721c24",
            border: `1px solid ${
              testResult.includes("許可") ? "#c3e6cb" : "#f5c6cb"
            }`,
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {testResult}
        </div>
      )}

      {relationships.length > 0 && (
        <div>
          <h4>現在のリレーションシップ</h4>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ddd",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#e9ecef" }}>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Resource
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Relation
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Subject
                </th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((relationship, index) => (
                <tr key={index}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {relationship.resource}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {relationship.relation}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {relationship.subject}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SpiceDBTest;
