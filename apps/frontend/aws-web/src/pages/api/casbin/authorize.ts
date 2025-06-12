import { NextApiRequest, NextApiResponse } from "next";

// Docker環境でのCasbinサービスURL
const CASBIN_SERVICE_URL =
  process.env.CASBIN_SERVICE_URL || "http://casbin-server:8080";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(`${CASBIN_SERVICE_URL}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Casbin service error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Casbin API proxy error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
