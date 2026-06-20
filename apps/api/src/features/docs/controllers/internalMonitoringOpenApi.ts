export const internalMonitoringSchemas = {
  InternalMetric: {
    type: "object",
    additionalProperties: true,
    properties: {
      key: { type: "string" },
      total: { type: "integer" },
    },
  },
  InternalHealthSnapshot: {
    type: "object",
    additionalProperties: true,
    required: [
      "actionMetrics",
      "actorMetrics",
      "alerts",
      "events",
      "failures",
      "generatedAt",
      "outcomeMetrics",
      "severityMetrics",
      "sinkMetrics",
      "status",
      "summary",
    ],
    properties: {
      actionMetrics: { type: "array", items: { type: "object" } },
      actorMetrics: { type: "array", items: { type: "object" } },
      alerts: { type: "array", items: { type: "object" } },
      events: { type: "array", items: { type: "object" } },
      failures: { type: "array", items: { type: "object" } },
      generatedAt: { type: "string", format: "date-time" },
      outcomeMetrics: {
        type: "array",
        items: { $ref: "#/components/schemas/InternalMetric" },
      },
      severityMetrics: {
        type: "array",
        items: { $ref: "#/components/schemas/InternalMetric" },
      },
      sinkMetrics: { type: "array", items: { type: "object" } },
      status: { type: "string", enum: ["critical", "healthy", "warning"] },
      summary: { type: "object", additionalProperties: true },
    },
  },
} as const;

export const internalMonitoringPaths = {
  "/api/v1/internal/health": {
    get: {
      tags: ["Internal Monitoring"],
      summary: "Read scoped admin observability snapshot",
      description:
        "Returns scoped audit events, sink failures, computed health status, alerts, action metrics, actor activity, and severity/outcome breakdowns for the current store.",
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
