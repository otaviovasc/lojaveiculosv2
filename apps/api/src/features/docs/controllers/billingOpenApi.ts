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
    required: ["entitlements", "plans", "storeId", "tenantId"],
    properties: {
      entitlements: {
        type: "array",
        items: { $ref: "#/components/schemas/BillingEntitlement" },
      },
      plans: { type: "array", items: { type: "object" } },
      storeId: { type: "string" },
      subscription: { type: ["object", "null"] },
      tenantId: { type: "string" },
    },
  },
} as const;

export const billingPaths = {
  "/api/v1/billing/overview": {
    get: {
      tags: ["Billing"],
      summary: "Read store billing overview",
      operationId: "getBillingOverview",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Billing overview for the current store.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingOverview" },
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
