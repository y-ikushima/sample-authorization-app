import { getCurrentUserId } from "@/lib/auth";
import { checkPermission, getPolicies } from "@/lib/casbin";
import React, { useState } from "react";

const CasbinTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<string[][]>([]);

  const runTest = async (resource: string, action: string) => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const result = await checkPermission(resource, action);
      setTestResult(
        `テスト結果: ユーザー "${userId}" が "${resource}" への "${action}" アクション - ${
          result ? "許可" : "拒否"
        }`
      );
    } catch (error) {
      setTestResult(`エラー: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const policiesData = await getPolicies();
      setPolicies(policiesData);
    } catch (error) {
      console.error("ポリシー取得エラー:", error);
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
      <h3>Casbin権限チェックテスト</h3>
      <p>
        現在のユーザー: <strong>{getCurrentUserId()}</strong>
      </p>

      <div style={{ marginBottom: "20px" }}>
        <h4>テストケース</h4>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => runTest("/system/system1", "GET")}
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
            system1 GET
          </button>
          <button
            onClick={() => runTest("/system/system1", "PUT")}
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
            system1 PUT
          </button>
          <button
            onClick={() => runTest("/system/system1/members", "GET")}
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
            system1 members GET
          </button>
          <button
            onClick={() => runTest("/system/system2", "GET")}
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
            system2 GET
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={loadPolicies}
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
          ポリシー一覧を取得
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

      {policies.length > 0 && (
        <div>
          <h4>現在のポリシー</h4>
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
                  Subject
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Object
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy, index) => (
                <tr key={index}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {policy[0]}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {policy[1]}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {policy[2]}
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

export default CasbinTest;
