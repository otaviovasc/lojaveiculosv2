export const inventoryFinanceSchemas = {
  CreateVehicleCostRequest: {
    type: "object",
    additionalProperties: false,
    required: ["amountCents", "kind"],
    properties: {
      amountCents: { type: "integer", minimum: 1 },
      costDate: { type: "string", format: "date-time" },
      description: { type: ["string", "null"], minLength: 1 },
      kind: {
        type: "string",
        enum: [
          "acquisition",
          "fee",
          "other",
          "preparation",
          "repair",
          "tax",
          "transport",
        ],
      },
    },
  },
} as const;
