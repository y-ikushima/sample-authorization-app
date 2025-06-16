import { NextApiRequest, NextApiResponse } from "next";

// 環境に応じてSpiceDBサーバーのURLを決定
const getSpiceDBServiceUrl = () => {
  // 環境変数で指定されている場合はそれを使用
  if (process.env.SPICEDB_SERVICE_URL) {
    return process.env.SPICEDB_SERVICE_URL;
  }

  // Docker環境内かどうかを判定
  // Docker環境では hostname が設定されるため、それで判断
  if (process.env.HOSTNAME && process.env.HOSTNAME !== "localhost") {
    // Docker環境内では内部サービス名を使用
    return "http://spicedb-server:8082";
  }

  // ローカル開発環境ではlocalhostを使用
  return "http://localhost:8082";
};

const SPICEDB_SERVICE_URL = getSpiceDBServiceUrl();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to SpiceDB service at:", SPICEDB_SERVICE_URL);
    console.log("Request body:", req.body);

    const response = await fetch(`${SPICEDB_SERVICE_URL}/remove-user-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    console.log("SpiceDB response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SpiceDB service error:", errorText);
      throw new Error(
        `SpiceDB service error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("SpiceDB response data:", data);
    res.status(200).json(data);
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: String(error) });
  }
}
