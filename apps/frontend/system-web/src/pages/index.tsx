import UserInfo from "@/components/UserInfo";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <UserInfo />
      <div>
        <div>
          <h1>Hello from system App</h1>
        </div>

        <h2>各認可サーバーのテスト</h2>
        <ul>
          <li>
            <Link href="/casbin/system">Casbin</Link>
          </li>
          <li>
            <Link href="/opa/system">OPA</Link>
          </li>
          <li>
            <Link href="/spicedb/system">SpiceDB</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
