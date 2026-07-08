import {
  billingProviderSyncPaths,
  billingProviderSyncSchemas,
} from "./billingProviderSyncOpenApi.js";
import {
  agencyBillingPaths,
  agencyBillingSchemas,
} from "./agencyBillingOpenApi.js";

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
      "authority",
      "chargePreview",
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
      authority: { type: "object", additionalProperties: true },
      chargePreview: { type: "object", additionalProperties: true },
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
  ...agencyBillingSchemas,
  ...billingProviderSyncSchemas,
} as const;

export const billingPaths = {
  "/api/v1/billing/overview": {
    get: {
      tags: ["Billing"],
      summary: "Read store-scoped billing and entitlement overview",
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
      summary: "Read store-scoped payment provider readiness",
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
  ...billingProviderSyncPaths,
  "/api/v1/billing/webhooks/asaas": {
    post: {
      tags: ["Billing"],
      summary: "Receive Asaas billing webhooks",
      operationId: "receiveAsaasBillingWebhook",
      parameters: [
        {
          in: "header",
          name: "asaas-access-token",
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
              required: ["id", "event"],
              properties: {
                event: { type: "string" },
                id: { type: "string" },
                payment: { type: "object", additionalProperties: true },
                subscription: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Webhook accepted, idempotently recorded, and synchronized or ignored.",
        },
        "403": {
          description: "Invalid Asaas webhook token.",
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
  ...agencyBillingPaths,
} as const;
