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

// SpiceDBチェック関数
async function checkSpiceDBPermission(
  subject: string,
  objectType: string,
  objectId: string,
  permission: string
): Promise<boolean> {
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

  const response = await fetch(`${SPICEDB_SERVICE_URL}/v1/permissions/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SPICEDB_AUTH_KEY}`,
    },
    body: JSON.stringify(checkRequest),
  });

  if (!response.ok) {
    throw new Error(`SpiceDB service error: ${response.status}`);
  }

  const checkResponse: SpiceDBCheckResponse = await response.json();
  return checkResponse.permissionship === "PERMISSIONSHIP_HAS_PERMISSION";
}

// グローバル管理者権限チェック
async function checkGlobalAdminPermission(subject: string): Promise<boolean> {
  try {
    return await checkSpiceDBPermission(
      subject,
      "global",
      "main",
      "full_access"
    );
  } catch (error) {
    console.error("Global admin check error:", error);
    return false;
  }
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

    // まずグローバル管理者権限をチェック
    const hasGlobalPermission = await checkGlobalAdminPermission(subject);
    if (hasGlobalPermission) {
      return res.status(200).json({ allowed: true });
    }

    // resourceを分割してobjectTypeとobjectIdを取得
    const parts = resource.split(":");
    if (parts.length !== 2) {
      return res.status(400).json({
        error: `Invalid resource format: ${resource}`,
      });
    }

    const [objectType, objectId] = parts;

    // 通常の権限チェック
    const allowed = await checkSpiceDBPermission(
      subject,
      objectType,
      objectId,
      permission
    );

    res.status(200).json({ allowed });
  } catch (error) {
    console.error("SpiceDB proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
