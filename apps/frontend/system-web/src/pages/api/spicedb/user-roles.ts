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

// フロントエンドが期待する形式
interface UserRelationship {
  resource: string;
  relation: string;
}

interface UserRolesResponse {
  user: string;
  relationships: UserRelationship[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Connecting to SpiceDB service at:", SPICEDB_SERVICE_URL);

    const { user, resource } = req.query;

    // ユーザーIDを正規化（user:プレフィックスを除去）
    let userId = "";
    if (user) {
      userId = (user as string).replace(/^user:/, "");
    }

    // フィルター条件を設定
    let relationshipFilter: SpiceDBRelationshipFilter = {};

    if (resource && userId) {
      // 特定のリソースと特定のユーザーのロールを取得
      const resourceParts = (resource as string).split(":");
      if (resourceParts.length === 2) {
        relationshipFilter = {
          resourceType: resourceParts[0],
          optionalResourceId: resourceParts[1],
          optionalSubjectFilter: {
            subjectType: "user",
            optionalSubjectId: userId,
          },
        };
      }
    } else if (resource) {
      // 特定のリソースの全ユーザーのロールを取得
      const resourceParts = (resource as string).split(":");
      if (resourceParts.length === 2) {
        relationshipFilter = {
          resourceType: resourceParts[0],
          optionalResourceId: resourceParts[1],
        };
      }
    } else if (userId) {
      // 特定のユーザーの全システムのロールを取得
      relationshipFilter = {
        resourceType: "system",
        optionalSubjectFilter: {
          subjectType: "user",
          optionalSubjectId: userId,
        },
      };
    } else {
      // 全てのシステムロールを取得
      relationshipFilter = {
        resourceType: "system",
      };
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

    const relationships: UserRelationship[] = [];

    for (const line of lines) {
      if (line.trim()) {
        try {
          const relationshipResponse: SpiceDBRelationshipsResponse =
            JSON.parse(line);

          if (relationshipResponse.result) {
            const rel = relationshipResponse.result.relationship;

            // system リソースタイプのみを対象とする
            if (
              rel.resource.objectType === "system" &&
              rel.subject.object.objectType === "user"
            ) {
              // 特定ユーザーのクエリの場合、そのユーザーのみフィルタリング
              if (userId && rel.subject.object.objectId !== userId) {
                continue;
              }

              relationships.push({
                resource: `${rel.resource.objectType}:${rel.resource.objectId}`,
                relation: rel.relation,
              });
            }
          }
        } catch (parseError) {
          console.warn("Failed to parse relationship line:", line, parseError);
        }
      }
    }

    // フロントエンドが期待する形式でレスポンスを返す
    const result: UserRolesResponse = {
      user: (user as string) || "",
      relationships: relationships,
    };

    console.log("SpiceDB response data:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("SpiceDB API proxy error:", error);
    res.status(500).json({
      error: "Failed to connect to SpiceDB service",
    });
  }
}
