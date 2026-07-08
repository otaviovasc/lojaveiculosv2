export const agencyBillingSchemas = {
  AgencyTenantOverview: {
    type: "object",
    additionalProperties: true,
    required: [
      "allocations",
      "authority",
      "chargePreview",
      "financialSummary",
      "stores",
      "tenant",
      "tenantId",
    ],
    properties: {
      allocations: { type: "array", items: { type: "object" } },
      authority: { type: "object", additionalProperties: true },
      chargePreview: { type: "object", additionalProperties: true },
      entitlementEvents: { type: "array", items: { type: "object" } },
      financialSummary: { type: "object", additionalProperties: true },
      plans: { type: "array", items: { type: "object" } },
      stores: { type: "array", items: { type: "object" } },
      subscription: { type: ["object", "null"] },
      tenant: { type: "object", additionalProperties: true },
      tenantId: { type: "string" },
    },
  },
} as const;

const tenantIdParam = {
  in: "path",
  name: "tenantId",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

export const agencyBillingPaths = {
  "/api/v1/agency/tenants/{tenantId}/overview": {
    get: {
      tags: ["Agency", "Billing"],
      summary: "Read agency tenant overview",
      operationId: "getAgencyTenantOverview",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam],
      responses: {
        "200": {
          description:
            "Agency tenant overview with managed stores, persisted subscription items, charge preview, financial summary, and entitlement events.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AgencyTenantOverview" },
            },
          },
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/billing/provider/status": {
    get: {
      tags: ["Agency", "Billing"],
      summary: "Read agency tenant payment provider readiness",
      operationId: "getAgencyBillingProviderStatus",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam],
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
  "/api/v1/agency/tenants/{tenantId}/billing/provider/checkout": {
    post: {
      tags: ["Agency", "Billing"],
      summary: "Create a hosted Asaas checkout for an agency tenant",
      operationId: "createAgencyBillingProviderCheckout",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                billingTypes: {
                  type: "array",
                  items: { type: "string", enum: ["CREDIT_CARD", "PIX"] },
                  minItems: 1,
                  maxItems: 2,
                },
                minutesToExpire: {
                  type: "integer",
                  minimum: 10,
                  maximum: 1440,
                },
                nextDueDate: { type: "string", format: "date" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Hosted Asaas checkout created from the agency tenant subscription_items.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BillingProviderCheckoutSessionResult",
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/billing/provider/subscription/sync": {
    post: {
      tags: ["Agency", "Billing"],
      summary: "Synchronize agency tenant subscription with Asaas",
      operationId: "syncAgencyBillingProviderSubscription",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                billingType: {
                  type: "string",
                  enum: ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"],
                },
                nextDueDate: { type: "string", format: "date" },
                updatePendingPayments: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Asaas customer and subscription synchronized from persisted subscription_items.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BillingProviderSubscriptionSyncResult",
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/entitlements/{featureKey}":
    {
      patch: {
        tags: ["Agency", "Billing"],
        summary: "Update one agency-managed store entitlement",
        operationId: "updateAgencyStoreEntitlement",
        security: [{ bearerAuth: [] }],
        parameters: [
          tenantIdParam,
          {
            in: "path",
            name: "storeId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
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
            description: "Updated agency tenant overview.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AgencyTenantOverview" },
              },
            },
          },
        },
      },
    },
} as const;
