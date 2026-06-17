export const storefrontPaths = {
  "/api/v1/public/storefront/listings": {
    get: {
      tags: ["Public Storefront"],
      summary: "List public storefront vehicles",
      description:
        "Lists published, visible vehicles for the store resolved from the request host subdomain.",
      operationId: "listPublicStorefrontVehicles",
      parameters: [
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 48, default: 24 },
        },
      ],
      responses: {
        "200": {
          description: "Public storefront vehicle list.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicStorefrontListings" },
            },
          },
        },
        "400": { description: "Store subdomain or query is invalid." },
        "404": { description: "Public storefront was not found." },
      },
    },
  },
} as const;

export const storefrontSchemas = {
  PublicStorefrontListings: {
    type: "object",
    additionalProperties: false,
    required: ["store", "listings"],
    properties: {
      store: { $ref: "#/components/schemas/PublicStorefrontStore" },
      listings: {
        type: "array",
        items: { $ref: "#/components/schemas/PublicVehicleListing" },
      },
    },
  },
  PublicStorefrontStore: {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "slug", "tenantId"],
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      slug: { type: "string" },
      tenantId: { type: "string" },
    },
  },
  PublicVehicleListing: {
    type: "object",
    additionalProperties: false,
    required: [
      "description",
      "listingId",
      "manufactureYear",
      "mileageKm",
      "modelYear",
      "priceCents",
      "slug",
      "status",
      "thumbnailUrl",
      "title",
    ],
    properties: {
      description: { type: ["string", "null"] },
      listingId: { type: "string" },
      manufactureYear: { type: ["integer", "null"] },
      mileageKm: { type: ["integer", "null"] },
      modelYear: { type: ["integer", "null"] },
      priceCents: { type: ["integer", "null"] },
      slug: { type: "string" },
      status: { type: "string", enum: ["available"] },
      thumbnailUrl: { type: ["string", "null"] },
      title: { type: "string" },
    },
  },
} as const;
