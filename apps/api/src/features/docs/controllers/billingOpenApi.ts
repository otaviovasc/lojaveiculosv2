export const billingSchemas = {
  BillingEntitlement: {
    type: "object",
    additionalProperties: false,
    required: ["featureKey", "status", "source"],
    properties: {
      endsAt: { type: ["string", "null"], format: "date-time" },
      featureKey: { type: "string" },
      metadata: { type: "object", additionalProperties: true },
      source: { type: "string" },
      startsAt: { type: ["string", "null"], format: "date-time" },
      status: {
        type: "string",
        enum: ["active", "inactive", "suspended", "trialing"],
      },
    },
  },
  BillingOverview: {
    type: "object",
    additionalProperties: true,
    required: [
      "allocations",
      "entitlementEvents",
      "entitlementMatrix",
      "entitlements",
      "financialSummary",
      "plans",
      "storeId",
      "tenantId",
    ],
    properties: {
      allocations: { type: "array", items: { type: "object" } },
      entitlementEvents: { type: "array", items: { type: "object" } },
      entitlementMatrix: { type: "array", items: { type: "object" } },
      entitlements: {
        type: "array",
        items: { $ref: "#/components/schemas/BillingEntitlement" },
      },
      financialSummary: { type: "object", additionalProperties: true },
      plans: { type: "array", items: { type: "object" } },
      storeId: { type: "string" },
      subscription: { type: ["object", "null"] },
      tenantId: { type: "string" },
    },
  },
  BillingProviderStatus: {
    type: "object",
    additionalProperties: false,
    required: [
      "configured",
      "missingConfiguration",
      "provider",
      "webhookConfigured",
    ],
    properties: {
      configured: { type: "boolean" },
      missingConfiguration: { type: "array", items: { type: "string" } },
      provider: { type: "string", const: "asaas" },
      webhookConfigured: { type: "boolean" },
    },
  },
} as const;

export const billingPaths = {
  "/api/v1/billing/overview": {
    get: {
      tags: ["Billing"],
      summary: "Read agency billing and entitlement overview",
      operationId: "getBillingOverview",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description:
            "Billing overview with subscription, allocation, matrix, payment summary, and entitlement history.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingOverview" },
            },
          },
        },
      },
    },
  },
  "/api/v1/billing/provider/status": {
    get: {
      tags: ["Billing"],
      summary: "Read payment provider readiness",
      operationId: "getBillingProviderStatus",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Asaas provider readiness without secrets.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingProviderStatus" },
            },
          },
        },
      },
    },
  },
  "/api/v1/billing/entitlements/{featureKey}": {
    patch: {
      tags: ["Billing"],
      summary: "Update one store entitlement",
      operationId: "updateBillingEntitlement",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "featureKey",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
              required: ["featureKey", "status"],
              properties: {
                featureKey: { type: "string" },
                reason: { type: ["string", "null"] },
                status: {
                  type: "string",
                  enum: ["active", "inactive", "suspended", "trialing"],
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated billing overview.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingOverview" },
            },
          },
        },
      },
    },
  },
} as const;
