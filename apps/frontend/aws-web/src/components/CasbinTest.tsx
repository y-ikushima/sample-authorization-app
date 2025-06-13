import { useGlobalAdminPermission } from "@/hooks/useAccessControl";
import { getCurrentUserId } from "@/lib/auth";
import { checkPermission } from "@/lib/casbin";
import { useState } from "react";

interface TestResult {
  test: string;
  result: boolean | string | null;
  error?: string;
}

const CasbinTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { isGlobalAdmin, loading: globalLoading } =
    useGlobalAdminPermission("casbin");

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
      const globalAdmin = await checkPermission("global:main", "*");
      addResult("Global Admin Permission", globalAdmin);

      const system1Read = await checkPermission("/system/system1", "GET");
      addResult("System1 Read Permission", system1Read);

      const system1Write = await checkPermission("/system/system1", "PUT");
      addResult("System1 Write Permission", system1Write);

      const system3Read = await checkPermission("/system/system3", "GET");
      addResult("System3 Read Permission", system3Read);

      const aws1Read = await checkPermission("/aws/aws1", "GET");
      addResult("AWS1 Read Permission", aws1Read);

      const aws1Write = await checkPermission("/aws/aws1", "PUT");
      addResult("AWS1 Write Permission", aws1Write);

      const aws1Delete = await checkPermission("/aws/aws1", "DELETE");
      addResult("AWS1 Delete Permission", aws1Delete);

      const aws2Read = await checkPermission("/aws/aws2", "GET");
      addResult("AWS2 Read Permission", aws2Read);
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
      { resource: "/aws/aws1", action: "GET" },
      { resource: "/aws/aws1", action: "PUT" },
      { resource: "/aws/aws1", action: "DELETE" },
      { resource: "/aws/aws1", action: "POST" },
      { resource: "/aws/aws2", action: "GET" },
      { resource: "/aws/aws3", action: "GET" },
      { resource: "/aws/aws3", action: "PUT" },
    ];

    for (const test of awsTests) {
      const result = await checkPermission(test.resource, test.action);
      addResult(`${test.resource} ${test.action}`, result);
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
        border: "2px solid #dc3545",
        borderRadius: "8px",
        margin: "20px 0",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h3 style={{ color: "#dc3545", marginTop: 0 }}>
        🔐 Casbin Authorization Test
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
            backgroundColor: "#dc3545",
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
          <strong>Casbin Test Info:</strong>
          <br />
          • このテストはCasbinサービス (http://casbin-server:8080)
          との接続を確認します
          <br />
          • 各種権限チェック（システム、AWS、グローバル）をテストします
          <br />• CasbinのRBACモデルとポリシーをテストします
        </small>
      </div>
    </div>
  );
};

export default CasbinTest;
