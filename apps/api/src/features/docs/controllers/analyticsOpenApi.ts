import { analyticsReportSchemas } from "./analyticsReportOpenApi.js";

export const analyticsSchemas = {
  ...analyticsReportSchemas,
  HomeDashboard: {
    type: "object",
    additionalProperties: false,
    properties: {
      generatedAt: { type: "string", format: "date-time" },
      inventory: {
        type: "object",
        additionalProperties: true,
        description:
          "availableAskingValueCents sums each published listing asking price once, independent of linked unit count.",
      },
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
    additionalProperties: false,
    properties: {
      attention: {
        type: "object",
        additionalProperties: false,
        description:
          "Overdue receivable fields are null when financialAvailability is restricted.",
        properties: {
          overdueReceivablesCents: { type: ["integer", "null"] },
          overdueReceivablesCount: { type: ["integer", "null"] },
          pendingChecklistsCount: { type: "integer", minimum: 0 },
        },
        required: [
          "overdueReceivablesCents",
          "overdueReceivablesCount",
          "pendingChecklistsCount",
        ],
      },
      crm: { $ref: "#/components/schemas/AnalyticsCrmReport" },
      documents: { $ref: "#/components/schemas/AnalyticsDocumentsReport" },
      finance: { $ref: "#/components/schemas/AnalyticsFinanceReport" },
      financialAvailability: {
        $ref: "#/components/schemas/AnalyticsReportAvailability",
      },
      generatedAt: { type: "string", format: "date-time" },
      inventory: { type: "object", additionalProperties: true },
      kpis: { type: "array", items: { type: "object" } },
      leadFunnel: { type: "array", items: { type: "object" } },
      leadSources: { type: "array", items: { type: "object" } },
      marketing: { $ref: "#/components/schemas/AnalyticsMarketingReport" },
      owner: { $ref: "#/components/schemas/AnalyticsOwnerReport" },
      period: { type: "object", additionalProperties: true },
      revenue: {
        type: "object",
        additionalProperties: false,
        description:
          "Closed sales use current revisions closed in the selected period; open receivables are pending revenue due in the selected period. All monetary values are null without finance.read.",
        properties: {
          closedSalesCents: { type: ["integer", "null"] },
          openReceivablesCents: { type: ["integer", "null"] },
          paidReceiptsCents: { type: ["integer", "null"] },
        },
        required: [
          "closedSalesCents",
          "openReceivablesCents",
          "paidReceiptsCents",
        ],
      },
      sales: {
        type: "object",
        additionalProperties: false,
        description:
          "closedCount remains available; ticket, revenue, and margin values are null without finance.read.",
        properties: {
          avgTicketCents: { type: ["integer", "null"] },
          closedCount: { type: "integer", minimum: 0 },
          grossMarginCents: { type: ["integer", "null"] },
          revenueCents: { type: ["integer", "null"] },
        },
        required: [
          "avgTicketCents",
          "closedCount",
          "grossMarginCents",
          "revenueCents",
        ],
      },
      storeId: { type: "string" },
      tenantId: { type: "string" },
    },
    required: [
      "attention",
      "crm",
      "documents",
      "finance",
      "financialAvailability",
      "generatedAt",
      "inventory",
      "kpis",
      "leadFunnel",
      "leadSources",
      "marketing",
      "owner",
      "period",
      "revenue",
      "sales",
      "storeId",
      "tenantId",
    ],
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
          description:
            "DB-backed analytics with permission-aware owner, finance, CRM, document, and marketing sections.",
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
