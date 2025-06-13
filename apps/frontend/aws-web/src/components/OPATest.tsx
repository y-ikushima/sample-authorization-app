import { useGlobalAdminPermission } from "@/hooks/useAccessControl";
import { getCurrentUserId } from "@/lib/auth";
import {
  checkPermission,
  evaluateOPAQuery,
  getOPAResources,
  getOPAUsers,
} from "@/lib/opa";
import { useState } from "react";

interface TestResult {
  test: string;
  result: boolean | string | null;
  error?: string;
}

const OPATest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { isGlobalAdmin, loading: globalLoading } =
    useGlobalAdminPermission("opa");

  const addResult = (
    test: string,
    result: boolean | string | null,
    error?: string
  ) => {
    setResults((prev) => [...prev, { test, result, error }]);
  };

  const runAllTests = async () => {
    setResults([]);
    setLoading(true);

    try {
      const userId = getCurrentUserId();
      addResult("Current User ID", userId);

      // 基本的な権限テスト
      const globalAdmin = await checkPermission("global:main", "admin");
      addResult("Global Admin Permission", globalAdmin);

      const system1Read = await checkPermission("system:system1", "read");
      addResult("System1 Read Permission", system1Read);

      const system1Write = await checkPermission("system:system1", "write");
      addResult("System1 Write Permission", system1Write);

      const system3Read = await checkPermission("system:system3", "read");
      addResult("System3 Read Permission", system3Read);

      const aws1Read = await checkPermission("aws:aws1", "read");
      addResult("AWS1 Read Permission", aws1Read);

      const aws1Write = await checkPermission("aws:aws1", "write");
      addResult("AWS1 Write Permission", aws1Write);

      const aws1Delete = await checkPermission("aws:aws1", "delete");
      addResult("AWS1 Delete Permission", aws1Delete);

      const aws2Read = await checkPermission("aws:aws2", "read");
      addResult("AWS2 Read Permission", aws2Read);

      // OPAサービスから情報取得
      try {
        const users = await getOPAUsers();
        addResult("OPA Users Count", users.length.toString());
      } catch (error) {
        addResult(
          "OPA Users",
          null,
          error instanceof Error ? error.message : "Failed to fetch users"
        );
      }

      try {
        const resources = await getOPAResources();
        addResult("OPA Resources Count", resources.length.toString());
      } catch (error) {
        addResult(
          "OPA Resources",
          null,
          error instanceof Error ? error.message : "Failed to fetch resources"
        );
      }

      // カスタムクエリテスト
      try {
        const customResult = await evaluateOPAQuery(
          "data.authz.user_aws_roles",
          { subject: userId }
        );
        addResult(
          "Custom Query (User AWS Roles)",
          customResult ? "Success" : "No Data"
        );
      } catch (error) {
        addResult(
          "Custom Query",
          null,
          error instanceof Error ? error.message : "Query failed"
        );
      }
    } catch (error) {
      addResult(
        "Test Suite",
        null,
        error instanceof Error ? error.message : "Test suite failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const testSpecificPermission = async () => {
    // AWS管理者権限のテスト
    const awsTests = [
      { resource: "aws:aws1", permission: "read" },
      { resource: "aws:aws1", permission: "write" },
      { resource: "aws:aws1", permission: "delete" },
      { resource: "aws:aws1", permission: "manage_members" },
      { resource: "aws:aws2", permission: "read" },
      { resource: "aws:aws3", permission: "read" },
      { resource: "aws:aws3", permission: "write" },
    ];

    for (const test of awsTests) {
      const result = await checkPermission(test.resource, test.permission);
      addResult(`${test.resource} ${test.permission}`, result);
    }
  };

  const ResultItem = ({ test, result, error }: TestResult) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px",
        backgroundColor: error ? "#f8d7da" : result ? "#d4edda" : "#fff3cd",
        margin: "4px 0",
        borderRadius: "4px",
        border:
          "1px solid " + (error ? "#f5c6cb" : result ? "#c3e6cb" : "#ffeaa7"),
      }}
    >
      <span style={{ fontWeight: "bold" }}>{test}:</span>
      <span
        style={{ color: error ? "#721c24" : result ? "#155724" : "#856404" }}
      >
        {error ? `Error: ${error}` : String(result)}
      </span>
    </div>
  );

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #007bff",
        borderRadius: "8px",
        margin: "20px 0",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h3 style={{ color: "#007bff", marginTop: 0 }}>
        🔐 OPA Authorization Test
      </h3>

      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Current User:</strong> {getCurrentUserId()}
        </p>
        <p>
          <strong>Global Admin Status:</strong>{" "}
          {globalLoading
            ? "Loading..."
            : isGlobalAdmin
            ? "✅ Admin"
            : "❌ Not Admin"}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={runAllTests}
          disabled={loading}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            marginRight: "10px",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Testing..." : "Run All Tests"}
        </button>

        <button
          onClick={testSpecificPermission}
          disabled={loading}
          style={{
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Test AWS Permissions
        </button>

        <button
          onClick={() => setResults([])}
          disabled={loading}
          style={{
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            marginLeft: "10px",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Clear Results
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Test Results:</h4>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {results.map((result, index) => (
              <ResultItem key={index} {...result} />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#e9ecef",
          borderRadius: "4px",
        }}
      >
        <small>
          <strong>OPA Test Info:</strong>
          <br />
          • このテストはOPAサービス (http://opa-server:8081)
          との接続を確認します
          <br />
          • 各種権限チェック（システム、AWS、グローバル）をテストします
          <br />• OPAポリシー評価とユーザー/リソース情報の取得をテストします
        </small>
      </div>
    </div>
  );
};

export default OPATest;
