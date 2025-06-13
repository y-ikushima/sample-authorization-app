import type { NextApiRequest, NextApiResponse } from "next";

interface OPAAuthRequest {
  subject: string;
  resource: string;
  permission: string;
}

interface OPAAuthResponse {
  allowed: boolean;
  reason?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OPAAuthResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subject, resource, permission }: OPAAuthRequest = req.body;

    if (!subject || !resource || !permission) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // OPAサービスのURL (Docker環境では opa-server、開発環境では localhost)
    const opaServiceUrl =
      process.env.OPA_SERVICE_URL || "http://localhost:8081";

    console.log(
      `OPA認可チェック: user=${subject}, resource=${resource}, permission=${permission}`
    );

    const response = await fetch(`${opaServiceUrl}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, resource, permission }),
    });

    if (!response.ok) {
      console.error(`OPAサービスエラー: ${response.status}`);
      return res.status(response.status).json({
        error: `OPA service error: ${response.status}`,
      });
    }

    const data: OPAAuthResponse = await response.json();

    console.log(
      `OPA認可結果: allowed=${data.allowed}, reason=${data.reason || "N/A"}`
    );

    res.status(200).json(data);
  } catch (error) {
    console.error("OPA認可チェックエラー:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
