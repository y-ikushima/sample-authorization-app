import type { NextApiRequest, NextApiResponse } from "next";

// 環境に応じてSpiceDBサーバーのURLを決定
const getSpiceDBServiceUrl = () => {
  if (process.env.SPICEDB_SERVICE_URL) {
    return process.env.SPICEDB_SERVICE_URL;
  }
  return "http://spicedb-server:8080";
};

const SPICEDB_SERVICE_URL = getSpiceDBServiceUrl();
const SPICEDB_AUTH_KEY = process.env.SPICEDB_AUTH_KEY || "spicedb-secret-key";

// 公式SpiceDB API用の構造体
interface SpiceDBRelationship {
  resource: {
    objectType: string;
    objectId: string;
  };
  relation: string;
  subject: {
    object: {
      objectType: string;
      objectId: string;
    };
  };
}

interface SpiceDBRelationshipsWriteRequest {
  updates: Array<{
    operation: "OPERATION_CREATE" | "OPERATION_DELETE";
    relationship: SpiceDBRelationship;
  }>;
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
    console.log("Request body:", req.body);

    const { resource, relation, subject } = req.body;

    if (!resource || !relation || !subject) {
      return res.status(400).json({
        error: "resource, relation, and subject are required",
      });
    }

    // resourceを分割してobjectTypeとobjectIdを取得
    const resourceParts = resource.split(":");
    if (resourceParts.length !== 2) {
      return res.status(400).json({
        error: "resource must be in format 'type:id'",
      });
    }

    const objectType = resourceParts[0];
    const objectId = resourceParts[1];

    // subjectからuser IDを抽出
    const userId = subject.replace(/^user:/, "");

    // リレーションシップ作成リクエストを構築
    const writeRequest: SpiceDBRelationshipsWriteRequest = {
      updates: [
        {
          operation: "OPERATION_CREATE",
          relationship: {
            resource: {
              objectType: objectType,
              objectId: objectId,
            },
            relation: relation,
            subject: {
              object: {
                objectType: "user",
                objectId: userId,
              },
            },
          },
        },
      ],
    };

    console.log(
      "SpiceDB write request:",
      JSON.stringify(writeRequest, null, 2)
    );

    const response = await fetch(
      `${SPICEDB_SERVICE_URL}/v1/relationships/write`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SPICEDB_AUTH_KEY}`,
        },
        body: JSON.stringify(writeRequest),
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

    const responseData = await response.json();
    console.log("SpiceDB response data:", responseData);

    res.status(200).json({
      added: true,
      relationship: { resource, relation, subject },
      writtenAt: responseData.writtenAt,
    });
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
