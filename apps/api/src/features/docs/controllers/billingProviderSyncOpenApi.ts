export const billingProviderSyncSchemas = {
  BillingPlanHire: {
    type: "object",
    additionalProperties: false,
    required: [
      "catalogVersion",
      "checkoutMode",
      "createdAt",
      "id",
      "phase",
      "planId",
      "planSnapshot",
      "quotedCents",
      "status",
      "storeId",
      "tenantId",
      "updatedAt",
    ],
    properties: {
      activatedAt: { type: ["string", "null"], format: "date-time" },
      catalogVersion: { type: "string" },
      checkoutMode: {
        type: "string",
        enum: ["free", "checkout", "quote_required"],
      },
      checkoutUrl: { type: ["string", "null"], format: "uri" },
      completedAt: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      failureCode: { type: ["string", "null"] },
      id: { type: "string", format: "uuid" },
      phase: {
        type: "string",
        enum: [
          "free_active",
          "checkout_created",
          "payment_pending",
          "activation_pending",
          "paid_active",
          "past_due_grace",
          "downgrade_scheduled",
          "reconciliation_failed",
        ],
      },
      planId: { type: "string", format: "uuid" },
      planSnapshot: {
        type: "object",
        additionalProperties: false,
        required: ["code", "name", "selectionRank"],
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          selectionRank: { type: "integer" },
        },
      },
      providerCheckoutId: { type: ["string", "null"] },
      providerPaymentId: { type: ["string", "null"] },
      providerSubscriptionId: { type: ["string", "null"] },
      quotedCents: { type: "integer", minimum: 0 },
      status: {
        type: "string",
        enum: [
          "created",
          "checkout_created",
          "payment_pending",
          "activation_pending",
          "paid_active",
          "downgrade_scheduled",
          "cancelled",
          "expired",
          "failed",
          "reconciliation_failed",
        ],
      },
      storeId: { type: "string", format: "uuid" },
      tenantId: { type: "string", format: "uuid" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  BillingPlanQuote: {
    type: "object",
    additionalProperties: false,
    required: [
      "catalogVersion",
      "id",
      "planId",
      "status",
      "storeId",
      "tenantId",
    ],
    properties: {
      catalogVersion: { type: "string" },
      expiresAt: { type: ["string", "null"], format: "date-time" },
      id: { type: "string", format: "uuid" },
      planId: { type: "string", format: "uuid" },
      quotedCents: { type: ["integer", "null"], minimum: 89700 },
      status: {
        type: "string",
        enum: ["requested", "approved", "expired", "rejected", "used"],
      },
      storeId: { type: "string", format: "uuid" },
      tenantId: { type: "string", format: "uuid" },
    },
  },
} as const;

export const planHireBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["idempotencyKey", "planId"],
        properties: {
          billingTypes: {
            type: "array",
            items: { type: "string", enum: ["CREDIT_CARD", "PIX"] },
            minItems: 1,
            maxItems: 2,
          },
          idempotencyKey: { type: "string", minLength: 8, maxLength: 191 },
          planId: { type: "string", format: "uuid" },
          quoteId: { type: "string", format: "uuid" },
        },
      },
    },
  },
} as const;

export const billingProviderSyncPaths = {
  "/api/v1/billing/plan-hires": {
    post: {
      tags: ["Billing"],
      summary: "Persist a store plan hire and create checkout when required",
      operationId: "createBillingPlanHire",
      security: [{ bearerAuth: [] }],
      requestBody: planHireBody,
      responses: {
        "201": {
          description:
            "Durable plan hire. Paid access remains unchanged until verified payment activation.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BillingPlanHire" },
            },
          },
        },
        "409": { description: "Plan hire conflicts with billing state." },
        "503": { description: "Asaas checkout or webhook is unavailable." },
      },
    },
  },
  "/api/v1/billing/plan-hires/{hireId}": {
    get: {
      tags: ["Billing"],
      summary: "Poll the verified server lifecycle for a store plan hire",
      operationId: "getBillingPlanHire",
      security: [{ bearerAuth: [] }],
      parameters: [
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
  "/api/v1/billing/plan-quotes": {
    post: {
      tags: ["Billing"],
      summary: "Request a server-owned Escala quote",
      operationId: "requestBillingPlanQuote",
      security: [{ bearerAuth: [] }],
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
} as const;
