import { NextApiRequest, NextApiResponse } from "next";

function getSpiceDBServiceUrl(): string {
  const url =
    process.env.SPICEDB_SERVICE_URL ||
    process.env.NEXT_PUBLIC_SPICEDB_SERVICE_URL ||
    "http://localhost:8080";
  return url;
}

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

// グローバル管理者権限をチェックする関数
async function checkGlobalAdminPermission(subject: string): Promise<boolean> {
  const checkRequest: SpiceDBCheckRequest = {
    resource: {
      objectType: "global",
      objectId: "main",
    },
    permission: "full_access",
    subject: {
      object: {
        objectType: "user",
        objectId: subject,
      },
    },
  };

  try {
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
      console.error("Global admin check failed:", response.status);
      return false;
    }

    const checkResponse: SpiceDBCheckResponse = await response.json();
    return checkResponse.permissionship === "PERMISSIONSHIP_HAS_PERMISSION";
  } catch (error) {
    console.error("Global admin check error:", error);
    return false;
  }
}

// 通常のSpiceDB権限チェック
async function checkSpiceDBPermission(
  subject: string,
  resource: string,
  permission: string
): Promise<boolean> {
  const parts = resource.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid resource format: ${resource}`);
  }

  const [objectType, objectId] = parts;

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
    const errorText = await response.text();
    console.error("SpiceDB service error:", errorText);
    throw new Error(`SpiceDB service error: ${response.status} - ${errorText}`);
  }

  const checkResponse: SpiceDBCheckResponse = await response.json();
  return checkResponse.permissionship === "PERMISSIONSHIP_HAS_PERMISSION";
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

    console.log(
      `SpiceDB認可チェック開始: subject=${subject}, resource=${resource}, permission=${permission}`
    );

    // まずグローバル管理者権限をチェック
    const isGlobalAdmin = await checkGlobalAdminPermission(subject);
    if (isGlobalAdmin) {
      console.log(`グローバル管理者権限により許可: subject=${subject}`);
      return res.status(200).json({ allowed: true });
    }

    // 通常の権限チェック
    const allowed = await checkSpiceDBPermission(subject, resource, permission);

    console.log(
      `SpiceDB認可チェック結果: subject=${subject}, resource=${resource}, permission=${permission}, allowed=${allowed}`
    );

    res.status(200).json({ allowed });
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
