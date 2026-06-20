export const storefrontLeadPaths = {
  "/api/v1/public/storefront/listings/{listingSlug}/leads": {
    post: {
      tags: ["Public Storefront"],
      summary: "Submit public storefront interest",
      description:
        "Creates a V2 CRM lead for the published listing resolved from the request host subdomain.",
      operationId: "createPublicStorefrontLead",
      parameters: [
        {
          name: "listingSlug",
          in: "path",
          required: true,
          schema: { type: "string", minLength: 1 },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PublicStorefrontLeadInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Created public lead reference.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicStorefrontLead" },
            },
          },
        },
        "200": {
          description:
            "Duplicate public lead suppressed; existing lead returned.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicStorefrontLead" },
            },
          },
        },
        "400": { description: "Store subdomain or request body is invalid." },
        "404": { description: "Public storefront or listing was not found." },
        "429": { description: "Too many public lead requests." },
      },
    },
  },
} as const;

export const storefrontLeadSchemas = {
  PublicStorefrontLeadInput: {
    type: "object",
    additionalProperties: false,
    required: ["buyerName"],
    properties: {
      buyerEmail: { type: "string", format: "email" },
      buyerName: { type: "string", minLength: 1, maxLength: 191 },
      buyerPhone: { type: "string", minLength: 3, maxLength: 40 },
      message: { type: "string", maxLength: 1000 },
    },
  },
  PublicStorefrontLead: {
    type: "object",
    additionalProperties: false,
    required: ["deduplicated", "lead"],
    properties: {
      deduplicated: { type: "boolean" },
      lead: {
        type: "object",
        additionalProperties: false,
        required: ["id", "source", "status"],
        properties: {
          id: { type: "string" },
          source: { type: "string", const: "public_site" },
          status: { type: "string" },
        },
      },
    },
  },
} as const;
