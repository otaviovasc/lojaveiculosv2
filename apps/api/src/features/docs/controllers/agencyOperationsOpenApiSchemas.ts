const inventoryMetrics = {
  type: "object",
  additionalProperties: false,
  required: ["availableListings", "reservedUnits", "totalListings"],
  properties: {
    availableListings: { type: "integer", minimum: 0 },
    reservedUnits: { type: "integer", minimum: 0 },
    totalListings: { type: "integer", minimum: 0 },
  },
} as const;

const leadMetrics = {
  type: "object",
  additionalProperties: false,
  required: ["activeCount", "conversionRate", "totalCount", "wonCount"],
  properties: {
    activeCount: { type: "integer", minimum: 0 },
    conversionRate: { type: "number", minimum: 0 },
    totalCount: { type: "integer", minimum: 0 },
    wonCount: { type: "integer", minimum: 0 },
  },
} as const;

const salesMetrics = {
  type: "object",
  additionalProperties: false,
  required: [
    "averageTicketCents",
    "closedCount",
    "grossMarginCents",
    "revenueCents",
  ],
  properties: {
    averageTicketCents: { type: "integer" },
    closedCount: { type: "integer", minimum: 0 },
    grossMarginCents: { type: "integer" },
    revenueCents: { type: "integer" },
  },
} as const;

const storeOptionProperties = {
  storeId: { type: "string", format: "uuid" },
  storeName: { type: "string" },
  storeSlug: { type: "string" },
} as const;

const storeOption = {
  type: "object",
  additionalProperties: false,
  required: ["storeId", "storeName", "storeSlug"],
  properties: storeOptionProperties,
} as const;

export const agencyOperationsSchemas = {
  AgencyStatsReport: {
    type: "object",
    additionalProperties: false,
    required: [
      "availableStores",
      "generatedAt",
      "leadSources",
      "period",
      "scopeStoreId",
      "stores",
      "tenantId",
      "totals",
    ],
    properties: {
      availableStores: { type: "array", items: storeOption },
      generatedAt: { type: "string", format: "date-time" },
      leadSources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["count", "key", "label"],
          properties: {
            count: { type: "integer", minimum: 0 },
            key: { type: "string" },
            label: { type: "string" },
          },
        },
      },
      period: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to"],
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
        },
      },
      scopeStoreId: { type: ["string", "null"], format: "uuid" },
      stores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "inventory",
            "leads",
            "sales",
            "storeId",
            "storeName",
            "storeSlug",
          ],
          properties: {
            ...storeOptionProperties,
            inventory: inventoryMetrics,
            leads: leadMetrics,
            sales: salesMetrics,
          },
        },
      },
      tenantId: { type: "string", format: "uuid" },
      totals: {
        type: "object",
        additionalProperties: false,
        required: ["inventory", "leads", "sales", "storeCount"],
        properties: {
          inventory: inventoryMetrics,
          leads: leadMetrics,
          sales: salesMetrics,
          storeCount: { type: "integer", minimum: 0 },
        },
      },
    },
  },
  AgencyTeamAccessDirectory: {
    type: "object",
    additionalProperties: false,
    required: ["stores", "tenantId"],
    properties: {
      stores: { type: "array", items: storeOption },
      tenantId: { type: "string", format: "uuid" },
    },
  },
  AgencyTeamAccessUpdateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["overrides", "role"],
    properties: {
      overrides: {
        type: "array",
        maxItems: 80,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["allowed", "permission"],
          properties: {
            allowed: { type: "boolean" },
            permission: { type: "string", minLength: 1 },
            reason: { type: ["string", "null"] },
          },
        },
      },
      role: {
        type: "string",
        enum: ["investor", "owner", "supervisor", "salesman"],
      },
    },
  },
} as const;
