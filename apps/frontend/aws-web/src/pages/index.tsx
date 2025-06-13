import CasbinTest from "@/components/CasbinTest";
import OPATest from "@/components/OPATest";
import SpiceDBTest from "@/components/SpiceDBTest";
import UserInfo from "@/components/UserInfo";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <UserInfo />
      <div>
        <div style={{ marginBottom: "30px" }}>
          <h1>AWS Web - Authorization Testing</h1>
          <p>
            このページでは、3つの認可システム（Casbin、SpiceDB、OPA）のテストを実行できます。
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h2>🔗 Quick Links</h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/casbin/system/system1"
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                padding: "8px 16px",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              Casbin: System1 AWS Accounts
            </Link>
            <Link
              href="/spicedb/system/system1"
              style={{
                backgroundColor: "#28a745",
                color: "white",
                padding: "8px 16px",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              SpiceDB: System1 AWS Accounts
            </Link>
            <Link
              href="/opa/system/system1"
              style={{
                backgroundColor: "#007bff",
                color: "white",
                padding: "8px 16px",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              OPA: System1 AWS Accounts
            </Link>
          </div>
        </div>

        {/* Authorization Tests */}
        <CasbinTest />
        <SpiceDBTest />
        <OPATest />
      </div>
    </>
  );
}
