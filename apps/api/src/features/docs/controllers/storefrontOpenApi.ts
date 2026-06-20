export const storefrontPaths = {
  "/api/v1/public/storefront/settings": {
    get: {
      tags: ["Public Storefront"],
      summary: "Get public storefront settings",
      description:
        "Returns public-safe hero, SEO, contact, and branding settings for the published store resolved from the request host subdomain.",
      operationId: "getPublicStorefrontSettings",
      responses: {
        "200": {
          description: "Public storefront settings.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicStorefrontSettings" },
            },
          },
        },
        "400": { description: "Store subdomain is invalid." },
        "404": { description: "Published public storefront was not found." },
      },
    },
  },
  "/api/v1/public/storefront/listings": {
    get: {
      tags: ["Public Storefront"],
      summary: "List public storefront vehicles",
      description:
        "Lists published, visible vehicles for the store resolved from the request host subdomain. thumbnailUrl is derived from the first public photo by displayOrder.",
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
        "Returns one published, visible vehicle and its public media ordered by displayOrder for the store resolved from the request host subdomain.",
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
  PublicStorefrontContact: {
    type: "object",
    additionalProperties: false,
    required: [
      "city",
      "contactEmail",
      "contactPhone",
      "whatsappPhone",
      "whatsappUrl",
    ],
    properties: {
      city: { type: ["string", "null"] },
      contactEmail: { type: ["string", "null"] },
      contactPhone: { type: ["string", "null"] },
      whatsappPhone: { type: ["string", "null"] },
      whatsappUrl: { type: ["string", "null"] },
    },
  },
  PublicStorefrontPublicStore: {
    type: "object",
    additionalProperties: false,
    required: ["name", "publicUrl", "slug"],
    properties: {
      name: { type: "string" },
      publicUrl: { type: "string" },
      slug: { type: "string" },
    },
  },
  PublicStorefrontSettings: {
    type: "object",
    additionalProperties: false,
    required: ["store", "site", "contact"],
    properties: {
      contact: { $ref: "#/components/schemas/PublicStorefrontContact" },
      site: { $ref: "#/components/schemas/PublicStorefrontSite" },
      store: { $ref: "#/components/schemas/PublicStorefrontPublicStore" },
    },
  },
  PublicStorefrontSite: {
    type: "object",
    additionalProperties: false,
    required: [
      "heroImageUrl",
      "layoutKey",
      "seoDescription",
      "seoTitle",
      "theme",
    ],
    properties: {
      heroImageUrl: { type: ["string", "null"] },
      layoutKey: { type: "string" },
      seoDescription: { type: ["string", "null"] },
      seoTitle: { type: ["string", "null"] },
      theme: { type: "object", additionalProperties: true },
    },
  },
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
    required: ["name", "slug"],
    properties: {
      name: { type: "string" },
      slug: { type: "string" },
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
    required: ["altText", "displayOrder", "kind", "url"],
    properties: {
      altText: { type: ["string", "null"] },
      displayOrder: { type: "integer" },
      kind: { type: "string", enum: ["document_preview", "photo", "video"] },
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
      manufactureYear: { type: ["integer", "null"] },
      mileageKm: { type: ["integer", "null"] },
      modelYear: { type: ["integer", "null"] },
      priceCents: { type: ["integer", "null"] },
      slug: { type: "string" },
      status: { type: "string", enum: ["available"] },
      thumbnailUrl: {
        type: ["string", "null"],
        description: "First public photo URL by displayOrder.",
      },
      title: { type: "string" },
    },
  },
} as const;
