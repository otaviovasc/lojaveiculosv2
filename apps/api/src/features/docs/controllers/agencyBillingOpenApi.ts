import { planHireBody } from "./billingProviderSyncOpenApi.js";

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

const storeIdParam = {
  in: "path",
  name: "storeId",
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
            "Agency tenant overview with managed stores and effective billing contracts.",
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
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-hires": {
    post: {
      tags: ["Agency", "Billing"],
      summary: "Persist a plan hire for an agency-managed store",
      operationId: "createAgencyBillingPlanHire",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam, storeIdParam],
      requestBody: planHireBody,
      responses: {
        "201": {
          description: "Store-scoped durable plan hire.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingPlanHire" },
            },
          },
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-hires/{hireId}":
    {
      get: {
        tags: ["Agency", "Billing"],
        summary: "Poll an agency-managed store plan hire",
        operationId: "getAgencyBillingPlanHire",
        security: [{ bearerAuth: [] }],
        parameters: [
          tenantIdParam,
          storeIdParam,
          {
            in: "path",
            name: "hireId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Store-scoped plan hire lifecycle.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BillingPlanHire" },
              },
            },
          },
          "404": { description: "Plan hire was not found in this store." },
        },
      },
    },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-quotes": {
    post: {
      tags: ["Agency", "Billing"],
      summary: "Request an Escala quote for an agency-managed store",
      operationId: "requestAgencyBillingPlanQuote",
      security: [{ bearerAuth: [] }],
      parameters: [tenantIdParam, storeIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["planId"],
              properties: { planId: { type: "string", format: "uuid" } },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Escala quote request created for the store.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingPlanQuote" },
            },
          },
        },
      },
    },
  },
  "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-quotes/{quoteId}/approve":
    {
      patch: {
        tags: ["Agency", "Billing"],
        summary: "Approve a versioned Escala quote for a managed store",
        operationId: "approveAgencyBillingPlanQuote",
        security: [{ bearerAuth: [] }],
        parameters: [
          tenantIdParam,
          storeIdParam,
          {
            in: "path",
            name: "quoteId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["expiresAt", "quotedCents"],
                properties: {
                  expiresAt: { type: "string", format: "date-time" },
                  quotedCents: { type: "integer", minimum: 89700 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Versioned store quote approved by an authorized agency actor.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BillingPlanQuote" },
              },
            },
          },
        },
      },
    },
} as const;
