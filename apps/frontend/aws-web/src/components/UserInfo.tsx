import { getCurrentUserId } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function UserInfo() {
  const [userId, setUserId] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setUserId(getCurrentUserId());
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>ユーザー情報</h2>
      <div>
        <p>
          <span>ユーザーID:</span> {userId}
        </p>
      </div>
    </div>
  );
}
