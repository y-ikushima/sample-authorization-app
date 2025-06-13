import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // OPAサービスのURL
    const opaServiceUrl =
      process.env.OPA_SERVICE_URL || "http://localhost:8081";

    console.log("OPAリソース情報取得");

    const response = await fetch(`${opaServiceUrl}/resources`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`OPAサービスエラー: ${response.status}`);
      return res.status(response.status).json({
        error: `OPA service error: ${response.status}`,
      });
    }

    const data = await response.json();

    console.log(`OPAリソース数: ${data.resources?.length || 0}`);

    res.status(200).json(data);
  } catch (error) {
    console.error("OPAリソース取得エラー:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
