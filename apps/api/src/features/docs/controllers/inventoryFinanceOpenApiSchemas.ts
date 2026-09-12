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
  UpdateVehicleCostRequest: {
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
  VoidVehicleCostRequest: {
    type: "object",
    additionalProperties: false,
    required: ["reason"],
    properties: {
      reason: { type: "string", minLength: 3, maxLength: 500 },
    },
  },
} as const;
