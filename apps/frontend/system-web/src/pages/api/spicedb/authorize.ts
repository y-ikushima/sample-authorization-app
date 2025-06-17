import type { NextApiRequest, NextApiResponse } from "next";

// 環境に応じてSpiceDBサーバーのURLを決定
const getSpiceDBServiceUrl = () => {
  // 開発環境で具体的に設定されている場合
  if (process.env.SPICEDB_SERVICE_URL) {
    return process.env.SPICEDB_SERVICE_URL;
  }

  // Docker Compose環境の場合
  if (process.env.NODE_ENV === "production") {
    return "http://spicedb-server:8080";
  }

  // ローカル開発環境の場合
  return "http://spicedb-server:8080";
};

const SPICEDB_SERVICE_URL = getSpiceDBServiceUrl();
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
    console.log("Connecting to SpiceDB service at:", SPICEDB_SERVICE_URL);

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

    console.log("SpiceDB response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SpiceDB service error:", errorText);
      return res.status(500).json({
        error: `SpiceDB service error: ${response.status} - ${errorText}`,
      });
    }

    const checkResponse: SpiceDBCheckResponse = await response.json();
    console.log("SpiceDB response data:", checkResponse);

    // PERMISSIONSHIP_HAS_PERMISSIONの場合は権限あり
    const allowed =
      checkResponse.permissionship === "PERMISSIONSHIP_HAS_PERMISSION";

    res.status(200).json({ allowed });
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
