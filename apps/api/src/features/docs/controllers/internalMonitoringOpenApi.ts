export const internalMonitoringSchemas = {
  InternalHealthSnapshot: {
    type: "object",
    additionalProperties: true,
    required: ["events", "failures", "generatedAt", "summary"],
    properties: {
      events: { type: "array", items: { type: "object" } },
      failures: { type: "array", items: { type: "object" } },
      generatedAt: { type: "string", format: "date-time" },
      summary: { type: "object", additionalProperties: true },
    },
  },
} as const;

export const internalMonitoringPaths = {
  "/api/v1/internal/health": {
    get: {
      tags: ["Internal Monitoring"],
      summary: "Read scoped audit health snapshot",
      operationId: "getInternalHealthSnapshot",
      security: [{ bearerAuth: ["audit.read"] }],
      parameters: [
        {
          in: "query",
          name: "limit",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
      ],
      responses: {
        "200": {
          description: "Audit health snapshot for the current store.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InternalHealthSnapshot" },
            },
          },
        },
      },
    },
  },
} as const;
