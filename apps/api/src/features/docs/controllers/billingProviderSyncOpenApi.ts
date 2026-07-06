export const billingProviderSyncSchemas = {
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
            "Asaas customer and subscription created or updated from calculated chargeables.",
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
