import { NextApiRequest, NextApiResponse } from "next";

// Docker環境でのCasbinサービスURL
function getCasbinServiceUrl(): string {
  return process.env.CASBIN_SERVICE_URL || "http://casbin-server:8080";
}

const CASBIN_SERVICE_URL = getCasbinServiceUrl();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 色々なHTTPメソッドをサポート
  if (!["POST", "GET"].includes(req.method || "")) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to Casbin service at:", CASBIN_SERVICE_URL);
    console.log("Request method:", req.method);
    console.log("Request query:", req.query);
    console.log("Request body:", req.body);

    let url = `${CASBIN_SERVICE_URL}/authorize`;
    const requestInit: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // GETの場合はクエリパラメータを付与、POSTの場合はボディを設定
    if (req.method === "GET") {
      const queryParams = new URLSearchParams(
        req.query as Record<string, string>
      );
      url = `${CASBIN_SERVICE_URL}/authorize?${queryParams.toString()}`;
    } else if (req.method === "POST") {
      requestInit.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, requestInit);

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
