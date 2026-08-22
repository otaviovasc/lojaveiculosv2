const integer = { type: "integer", minimum: 0 } as const;
const money = { type: "integer", minimum: 0 } as const;
const availability = {
  $ref: "#/components/schemas/AnalyticsReportAvailability",
} as const;

export const analyticsReportSchemas = {
  AnalyticsReportAvailability: {
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        properties: { status: { type: "string", enum: ["available"] } },
        required: ["status"],
      },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          reason: { type: "string" },
          status: {
            type: "string",
            enum: ["restricted", "unavailable"],
          },
        },
        required: ["reason", "status"],
      },
    ],
  },
  AnalyticsOwnerVehicle: {
    type: "object",
    additionalProperties: false,
    properties: {
      acquisitionCents: money,
      closedAt: { type: "string", format: "date-time" },
      commissionCents: money,
      marginCents: { type: ["integer", "null"] },
      marginStatus: {
        type: "string",
        enum: ["complete", "missing_acquisition"],
      },
      operationalCostsCents: money,
      plate: { type: ["string", "null"] },
      saleId: { type: "string" },
      salePriceCents: money,
      title: { type: "string" },
      totalCostCents: money,
      unitId: { type: ["string", "null"] },
    },
    required: [
      "acquisitionCents",
      "closedAt",
      "commissionCents",
      "marginCents",
      "marginStatus",
      "operationalCostsCents",
      "plate",
      "saleId",
      "salePriceCents",
      "title",
      "totalCostCents",
      "unitId",
    ],
  },
  AnalyticsOwnerReport: {
    type: "object",
    additionalProperties: false,
    properties: {
      availability,
      completeSalesCount: integer,
      missingAcquisitionCount: integer,
      officialMarginCents: { type: "integer" },
      vehicles: {
        type: "array",
        items: { $ref: "#/components/schemas/AnalyticsOwnerVehicle" },
      },
    },
    required: [
      "availability",
      "completeSalesCount",
      "missingAcquisitionCount",
      "officialMarginCents",
      "vehicles",
    ],
  },
  AnalyticsFinanceReport: {
    type: "object",
    additionalProperties: false,
    properties: {
      availability,
      categoryBreakdown: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            count: integer,
            key: { type: "string" },
            paidCents: money,
            plannedCents: money,
          },
          required: ["count", "key", "paidCents", "plannedCents"],
        },
      },
      paidOutflowCents: money,
      pendingOutflowCents: money,
      plannedOutflowCents: money,
      plannedRevenueCents: money,
      realizedBalanceCents: { type: "integer" },
      receivedRevenueCents: money,
    },
    required: [
      "availability",
      "categoryBreakdown",
      "paidOutflowCents",
      "pendingOutflowCents",
      "plannedOutflowCents",
      "plannedRevenueCents",
      "realizedBalanceCents",
      "receivedRevenueCents",
    ],
  },
  AnalyticsCrmReport: {
    type: "object",
    additionalProperties: false,
    properties: {
      availability,
      averageInteractionsPerLead: { type: "number", minimum: 0 },
      conversionRate: { type: "number", minimum: 0 },
      interactionCount: integer,
      lostLeads: integer,
      totalLeads: integer,
      wonLeads: integer,
    },
    required: [
      "availability",
      "averageInteractionsPerLead",
      "conversionRate",
      "interactionCount",
      "lostLeads",
      "totalLeads",
      "wonLeads",
    ],
  },
  AnalyticsDocumentsReport: {
    type: "object",
    additionalProperties: false,
    properties: {
      availability,
      byKind: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { count: integer, key: { type: "string" } },
          required: ["count", "key"],
        },
      },
      issued: integer,
      pendingSignature: integer,
      signed: integer,
      total: integer,
    },
    required: [
      "availability",
      "byKind",
      "issued",
      "pendingSignature",
      "signed",
      "total",
    ],
  },
  AnalyticsMarketingReport: {
    type: "object",
    additionalProperties: false,
    properties: { availability },
    required: ["availability"],
  },
} as const;
