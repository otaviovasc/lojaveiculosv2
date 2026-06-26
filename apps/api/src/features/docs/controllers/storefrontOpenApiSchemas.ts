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
    required: [
      "altText",
      "displayOrder",
      "kind",
      "unitColorName",
      "unitId",
      "url",
    ],
    properties: {
      altText: { type: ["string", "null"] },
      displayOrder: { type: "integer" },
      kind: { type: "string", enum: ["document_preview", "photo", "video"] },
      unitColorName: { type: ["string", "null"] },
      unitId: { type: "string" },
      url: { type: "string" },
    },
  },
  PublicVehicleMediaGroup: {
    type: "object",
    additionalProperties: false,
    required: ["colorName", "media", "unitId"],
    properties: {
      colorName: { type: ["string", "null"] },
      media: {
        type: "array",
        items: { $ref: "#/components/schemas/PublicVehicleMedia" },
      },
      unitId: { type: "string" },
    },
  },
  PublicVehicleListingDetail: {
    allOf: [
      { $ref: "#/components/schemas/PublicVehicleListing" },
      {
        type: "object",
        additionalProperties: false,
        required: ["media", "mediaGroups"],
        properties: {
          media: {
            type: "array",
            items: { $ref: "#/components/schemas/PublicVehicleMedia" },
          },
          mediaGroups: {
            type: "array",
            items: { $ref: "#/components/schemas/PublicVehicleMediaGroup" },
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
        description: "First public photo URL from the default unit gallery.",
      },
      title: { type: "string" },
    },
  },
} as const;
