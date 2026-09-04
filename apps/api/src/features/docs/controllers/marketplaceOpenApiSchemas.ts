export const directMarketplaceJobRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["jobType", "metadata", "provider"],
        properties: {
          jobType: {
            type: "string",
            enum: ["listing_publish", "listing_update", "listing_unpublish"],
          },
          metadata: {
            type: "object",
            additionalProperties: false,
            required: ["commandId", "listingId"],
            properties: {
              commandId: {
                type: "string",
                format: "uuid",
                description:
                  "Stable client command id used to make retries idempotent.",
              },
              listingId: { type: "string", minLength: 1 },
            },
          },
          provider: {
            type: "string",
            enum: ["olx", "mercado_livre"],
          },
        },
      },
    },
  },
} as const;
