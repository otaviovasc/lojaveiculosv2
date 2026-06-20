export const analyticsSchemas = {
  AnalyticsDashboard: {
    type: "object",
    additionalProperties: true,
    properties: {
      inventory: { type: "object", additionalProperties: true },
      kpis: { type: "array", items: { type: "object" } },
      leadFunnel: { type: "array", items: { type: "object" } },
      leadSources: { type: "array", items: { type: "object" } },
      revenue: { type: "object", additionalProperties: true },
    },
  },
} as const;

export const analyticsPaths = {
  "/api/v1/analytics/dashboard": {
    get: {
      tags: ["Analytics"],
      summary: "Read store commercial analytics dashboard",
      operationId: "getAnalyticsDashboard",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Analytics dashboard.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalyticsDashboard" },
            },
          },
        },
      },
    },
  },
} as const;
