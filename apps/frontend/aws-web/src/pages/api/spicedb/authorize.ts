import type { NextApiRequest, NextApiResponse } from "next";

const SPICEDB_SERVICE_URL =
  process.env.SPICEDB_SERVICE_URL || "http://spicedb-server:8082";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(`${SPICEDB_SERVICE_URL}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `SpiceDB service error: ${response.status}`,
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("SpiceDB proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
