export const complianceSchemas = {
  ComplianceSnapshot: {
    type: "object",
    additionalProperties: true,
    properties: {
      controls: { type: "array", items: { type: "object" } },
      score: { type: "number" },
      summary: { type: "object", additionalProperties: true },
      workflows: { type: "array", items: { type: "object" } },
    },
  },
} as const;

export const compliancePaths = {
  "/api/v1/compliance/snapshot": {
    get: {
      tags: ["Compliance"],
      summary: "Read LGPD and security compliance posture",
      operationId: "getComplianceSnapshot",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Compliance controls and workflow posture.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ComplianceSnapshot" },
            },
          },
        },
      },
    },
  },
} as const;
