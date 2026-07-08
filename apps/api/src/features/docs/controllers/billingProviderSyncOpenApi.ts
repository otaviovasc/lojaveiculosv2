export const billingProviderSyncSchemas = {
  BillingProviderCheckoutSessionResult: {
    type: "object",
    additionalProperties: false,
    required: [
      "checkoutUrl",
      "expiresAt",
      "externalReference",
      "provider",
      "providerCheckoutId",
      "subscriptionId",
    ],
    properties: {
      checkoutUrl: { type: "string", format: "uri" },
      expiresAt: { type: ["string", "null"], format: "date-time" },
      externalReference: { type: "string" },
      provider: { type: "string", const: "asaas" },
      providerCheckoutId: { type: "string" },
      subscriptionId: { type: "string" },
    },
  },
  BillingProviderSubscriptionSyncResult: {
    type: "object",
    additionalProperties: false,
    required: [
      "billingType",
      "chargeTotalCents",
      "nextDueDate",
      "provider",
      "providerCustomerId",
      "providerSubscriptionId",
      "status",
      "subscriptionId",
      "synchronizedAt",
    ],
    properties: {
      billingType: {
        type: "string",
        enum: ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"],
      },
      chargeTotalCents: { type: "integer" },
      nextDueDate: { type: "string", format: "date" },
      provider: { type: "string", const: "asaas" },
      providerCustomerId: { type: "string" },
      providerSubscriptionId: { type: "string" },
      status: {
        type: "string",
        enum: ["active", "cancelled", "expired", "past_due", "trialing"],
      },
      subscriptionId: { type: "string" },
      synchronizedAt: { type: "string", format: "date-time" },
    },
  },
} as const;

export const billingProviderSyncPaths = {
  "/api/v1/billing/provider/checkout": {
    post: {
      tags: ["Billing"],
      summary: "Create a hosted Asaas checkout for the current subscription",
      operationId: "createBillingProviderCheckout",
      security: [{ bearerAuth: [] }],
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
            "Hosted Asaas checkout created from persisted subscription_items chargeables.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BillingProviderCheckoutSessionResult",
              },
            },
          },
        },
        "409": { description: "Subscription has no chargeable value." },
        "502": { description: "Asaas checkout request failed." },
        "503": { description: "Asaas provider checkout is not configured." },
      },
    },
  },
  "/api/v1/billing/provider/subscription/sync": {
    post: {
      tags: ["Billing"],
      summary: "Synchronize the current subscription with Asaas",
      operationId: "syncBillingProviderSubscription",
      security: [{ bearerAuth: [] }],
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
            "Asaas customer and subscription created or updated from persisted subscription_items chargeables.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BillingProviderSubscriptionSyncResult",
              },
            },
          },
        },
        "502": { description: "Asaas request failed." },
        "503": { description: "Asaas provider is not configured." },
      },
    },
  },
} as const;
