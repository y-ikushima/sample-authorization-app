import type { NextApiRequest, NextApiResponse } from "next";

interface OPAEvaluateRequest {
  query: string;
  input: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, input }: OPAEvaluateRequest = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // OPAサービスのURL
    const opaServiceUrl =
      process.env.OPA_SERVICE_URL || "http://localhost:8081";

    console.log(`OPAクエリ評価: query=${query}`);

    const response = await fetch(`${opaServiceUrl}/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, input }),
    });

    if (!response.ok) {
      console.error(`OPAサービスエラー: ${response.status}`);
      return res.status(response.status).json({
        error: `OPA service error: ${response.status}`,
      });
    }

    const data = await response.json();

    console.log(`OPAクエリ結果:`, data);

    res.status(200).json(data);
  } catch (error) {
    console.error("OPAクエリ評価エラー:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
