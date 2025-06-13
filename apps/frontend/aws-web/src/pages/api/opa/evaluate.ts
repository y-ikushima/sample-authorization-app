import type { NextApiRequest, NextApiResponse } from "next";

const OPA_SERVICE_URL = process.env.OPA_SERVICE_URL || "http://opa-server:8081";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(`${OPA_SERVICE_URL}/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OPA service error: ${response.status}`,
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("OPA evaluate proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to OPA service",
    });
  }
}
