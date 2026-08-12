export const analyticsSchemas = {
  HomeDashboard: {
    type: "object",
    additionalProperties: false,
    properties: {
      generatedAt: { type: "string", format: "date-time" },
      inventory: { type: "object", additionalProperties: true },
      leadSummary: { type: "object", additionalProperties: true },
      storeId: { type: "string" },
      tenantId: { type: "string" },
    },
    required: [
      "generatedAt",
      "inventory",
      "leadSummary",
      "storeId",
      "tenantId",
    ],
  },
  AnalyticsDashboard: {
    type: "object",
    additionalProperties: true,
    properties: {
      attention: { type: "object", additionalProperties: true },
      inventory: { type: "object", additionalProperties: true },
      kpis: { type: "array", items: { type: "object" } },
      leadFunnel: { type: "array", items: { type: "object" } },
      leadSources: { type: "array", items: { type: "object" } },
      period: { type: "object", additionalProperties: true },
      revenue: { type: "object", additionalProperties: true },
      sales: { type: "object", additionalProperties: true },
    },
  },
} as const;

export const analyticsPaths = {
  "/api/v1/analytics/home": {
    get: {
      tags: ["Dashboard"],
      summary: "Read the core store home dashboard",
      operationId: "getHomeDashboard",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Core operational dashboard.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HomeDashboard" },
            },
          },
        },
      },
    },
  },
  "/api/v1/analytics/dashboard": {
    get: {
      tags: ["Analytics"],
      summary: "Read store commercial analytics dashboard",
      operationId: "getAnalyticsDashboard",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "query",
          name: "from",
          required: false,
          schema: { type: "string", format: "date" },
          description:
            "Start of the reporting period (YYYY-MM-DD). Defaults to 30 days ago.",
        },
        {
          in: "query",
          name: "to",
          required: false,
          schema: { type: "string", format: "date" },
          description:
            "End of the reporting period (YYYY-MM-DD). Defaults to today.",
        },
      ],
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
