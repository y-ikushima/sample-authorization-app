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
interface SpiceDBRelationshipFilter {
  resourceType?: string;
  optionalResourceId?: string;
  optionalRelation?: string;
  optionalSubjectFilter?: {
    subjectType?: string;
    optionalSubjectId?: string;
  };
}

interface SpiceDBRelationshipsReadRequest {
  relationshipFilter: SpiceDBRelationshipFilter;
}

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

interface SpiceDBRelationshipsResponse {
  result?: {
    relationship: SpiceDBRelationship;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to SpiceDB service at:", SPICEDB_SERVICE_URL);

    const relationshipFilter: SpiceDBRelationshipFilter = {};

    // GETパラメータまたはPOSTボディからフィルター条件を取得
    const params = req.method === "GET" ? req.query : req.body;
    const { resourceType, resourceId, relation, subjectType, subjectId } =
      params;

    if (resourceType) {
      relationshipFilter.resourceType = resourceType as string;
    }
    if (resourceId) {
      relationshipFilter.optionalResourceId = resourceId as string;
    }
    if (relation) {
      relationshipFilter.optionalRelation = relation as string;
    }
    if (subjectType || subjectId) {
      relationshipFilter.optionalSubjectFilter = {};
      if (subjectType) {
        relationshipFilter.optionalSubjectFilter.subjectType =
          subjectType as string;
      }
      if (subjectId) {
        relationshipFilter.optionalSubjectFilter.optionalSubjectId =
          subjectId as string;
      }
    }

    const readRequest: SpiceDBRelationshipsReadRequest = {
      relationshipFilter,
    };

    const response = await fetch(
      `${SPICEDB_SERVICE_URL}/v1/relationships/read`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SPICEDB_AUTH_KEY}`,
        },
        body: JSON.stringify(readRequest),
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

    // レスポンスをストリームとして読み取り（SpiceDBは行区切りのJSONを返す）
    const responseText = await response.text();
    const lines = responseText.trim().split("\n");

    const relationships: SpiceDBRelationship[] = [];

    for (const line of lines) {
      if (line.trim()) {
        try {
          const relationshipResponse: SpiceDBRelationshipsResponse =
            JSON.parse(line);

          if (relationshipResponse.result) {
            relationships.push(relationshipResponse.result.relationship);
          }
        } catch (parseError) {
          console.warn("Failed to parse relationship line:", line, parseError);
        }
      }
    }

    console.log("SpiceDB response data:", relationships);
    res.status(200).json(relationships);
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
