import { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
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
          {statusCode
            ? `${statusCode} - サーバーエラーが発生しました`
            : "クライアントエラーが発生しました"}
        </h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>
          申し訳ございません。何らかの問題が発生しました。
        </p>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
