import { NextApiRequest, NextApiResponse } from "next";

const SPICEDB_SERVICE_URL =
  process.env.SPICEDB_SERVICE_URL || "http://spicedb-server:8080";

const SPICEDB_AUTH_KEY = process.env.SPICEDB_AUTH_KEY || "spicedb-secret-key";

// 公式SpiceDB API用の構造体
interface SpiceDBCheckRequest {
  resource: {
    objectType: string;
    objectId: string;
  };
  permission: string;
  subject: {
    object: {
      objectType: string;
      objectId: string;
    };
  };
}

interface SpiceDBCheckResponse {
  permissionship: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subject, resource, permission } = req.body;

    // resourceを分割してobjectTypeとobjectIdを取得
    const parts = resource.split(":");
    if (parts.length !== 2) {
      return res.status(400).json({
        error: `Invalid resource format: ${resource}`,
      });
    }

    const [objectType, objectId] = parts;

    // 公式SpiceDB APIリクエスト構造体を作成
    const checkRequest: SpiceDBCheckRequest = {
      resource: {
        objectType,
        objectId,
      },
      permission,
      subject: {
        object: {
          objectType: "user",
          objectId: subject,
        },
      },
    };

    const response = await fetch(
      `${SPICEDB_SERVICE_URL}/v1/permissions/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SPICEDB_AUTH_KEY}`,
        },
        body: JSON.stringify(checkRequest),
      }
    );

    if (!response.ok) {
      console.error("SpiceDB service error:", response.status);
      return res.status(500).json({
        error: `SpiceDB service error: ${response.status}`,
      });
    }

    const checkResponse: SpiceDBCheckResponse = await response.json();

    // PERMISSIONSHIP_HAS_PERMISSIONの場合は権限あり
    const allowed =
      checkResponse.permissionship === "PERMISSIONSHIP_HAS_PERMISSION";

    res.status(200).json({ allowed });
  } catch (error) {
    console.error("SpiceDB proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
