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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to Casbin service at:", CASBIN_SERVICE_URL);
    console.log("Request body:", req.body);

    const response = await fetch(`${CASBIN_SERVICE_URL}/add-role`, {
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
