import { auth, getCurrentUserId } from "@/lib/auth";
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
        <p>
          <span>認証状態:</span>{" "}
          {auth.isAuthenticated() ? "認証済み" : "未認証"}
        </p>
        <div>
          <button
            onClick={() => {
              const newUserId = prompt(
                "新しいユーザーIDを入力してください:",
                userId
              );
              if (newUserId) {
                auth.setUserId(newUserId);
                setUserId(newUserId);
              }
            }}
          >
            ユーザーIDを変更
          </button>
        </div>
      </div>
    </div>
  );
}
