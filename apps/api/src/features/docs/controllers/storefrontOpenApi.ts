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
  "/api/v1/public/storefront/listings/{listingSlug}": {
    get: {
      tags: ["Public Storefront"],
      summary: "Get public storefront vehicle detail",
      description:
        "Returns one published, visible vehicle and its public media for the store resolved from the request host subdomain.",
      operationId: "getPublicStorefrontVehicle",
      parameters: [
        {
          name: "listingSlug",
          in: "path",
          required: true,
          schema: { type: "string", minLength: 1 },
        },
      ],
      responses: {
        "200": {
          description: "Public storefront vehicle detail.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PublicStorefrontListingDetail",
              },
            },
          },
        },
        "400": { description: "Store subdomain is invalid." },
        "404": { description: "Public storefront or listing was not found." },
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
  PublicStorefrontListingDetail: {
    type: "object",
    additionalProperties: false,
    required: ["store", "listing"],
    properties: {
      store: { $ref: "#/components/schemas/PublicStorefrontStore" },
      listing: { $ref: "#/components/schemas/PublicVehicleListingDetail" },
    },
  },
  PublicVehicleMedia: {
    type: "object",
    additionalProperties: false,
    required: ["altText", "displayOrder", "kind", "mediaId", "url"],
    properties: {
      altText: { type: ["string", "null"] },
      displayOrder: { type: "integer" },
      kind: { type: "string", enum: ["document_preview", "photo", "video"] },
      mediaId: { type: "string" },
      url: { type: "string" },
    },
  },
  PublicVehicleListingDetail: {
    allOf: [
      { $ref: "#/components/schemas/PublicVehicleListing" },
      {
        type: "object",
        additionalProperties: false,
        required: ["media"],
        properties: {
          media: {
            type: "array",
            items: { $ref: "#/components/schemas/PublicVehicleMedia" },
          },
        },
      },
    ],
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
