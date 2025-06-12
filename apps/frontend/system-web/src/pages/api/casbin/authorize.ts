import { NextApiRequest, NextApiResponse } from "next";

// 環境に応じてCasbinサーバーのURLを決定
const getCasbinServiceUrl = () => {
  // 環境変数で指定されている場合はそれを使用
  if (process.env.CASBIN_SERVICE_URL) {
    return process.env.CASBIN_SERVICE_URL;
  }

  // Docker環境内かどうかを判定
  // Docker環境では hostname が設定されるため、それで判断
  if (process.env.HOSTNAME && process.env.HOSTNAME !== "localhost") {
    // Docker環境内では内部サービス名を使用
    return "http://casbin-server:8080";
  }

  // ローカル開発環境ではlocalhostを使用
  return "http://localhost:8080";
};

const CASBIN_SERVICE_URL = getCasbinServiceUrl();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to Casbin service at:", CASBIN_SERVICE_URL);
    console.log("Request body:", req.body);

    const response = await fetch(`${CASBIN_SERVICE_URL}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    console.log("Casbin response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Casbin service error:", errorText);
      throw new Error(
        `Casbin service error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Casbin response data:", data);
    res.status(200).json(data);
  } catch (error) {
    console.error("Casbin API proxy error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: String(error) });
  }
}
