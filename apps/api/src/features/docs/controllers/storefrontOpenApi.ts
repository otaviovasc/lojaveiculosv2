export { storefrontSchemas } from "./storefrontOpenApiSchemas.js";

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
        "Lists published, visible vehicles for the store resolved from the request host subdomain. thumbnailUrl is derived from the deterministic default unit gallery.",
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
        "Returns one published, visible vehicle and its unit/color media groups for the store resolved from the request host subdomain.",
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
