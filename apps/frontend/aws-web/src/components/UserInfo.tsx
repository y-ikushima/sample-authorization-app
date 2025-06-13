import { getCurrentUserId } from "@/lib/auth";

const UserInfo = () => {
  const userId = getCurrentUserId();

  return (
    <div
      style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "4px",
        padding: "12px",
        marginBottom: "20px",
        fontSize: "14px",
      }}
    >
      <strong>現在のユーザー:</strong> {userId}
    </div>
  );
};

export default UserInfo;
