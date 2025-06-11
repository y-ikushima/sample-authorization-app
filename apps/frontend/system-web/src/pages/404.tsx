export default function Custom404() {
  return (
    <div
      style={{
        backgroundColor: "#A5A5A5FF",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ color: "#311b92", fontSize: "2rem" }}>
          404 - ページが見つかりません
        </h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>
          お探しのページは存在しません。
        </p>
      </div>
    </div>
  );
}
