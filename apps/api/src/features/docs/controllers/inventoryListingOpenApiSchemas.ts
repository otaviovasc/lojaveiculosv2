import {
  listingTechnicalSchemas,
  objectSchema,
} from "./inventoryOpenApiSchemaParts.js";

export const listingStatusEnum = [
  "archived",
  "draft",
  "in_preparation",
  "published",
  "sold_out",
  "unpublished",
] as const;

export const inventoryListingSchemas = {
  InventoryListing: objectSchema(["id", "status", "title"], {
    commercialTags: { type: "array", items: { type: "string" } },
    createdAt: { type: "string", format: "date-time" },
    description: { type: ["string", "null"] },
    ...listingTechnicalSchemas,
    id: { type: "string" },
    isVisibleOnPublicSite: { type: "boolean" },
    plate: { type: ["string", "null"] },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    publicSlug: { type: ["string", "null"] },
    resaleAnalysis: {
      anyOf: [
        { $ref: "#/components/schemas/InventoryResaleAnalysisSnapshot" },
        { type: "null" },
      ],
    },
    status: {
      type: "string",
      enum: listingStatusEnum,
    },
    title: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
    unitIds: { type: "array", items: { type: "string" } },
    videoUrl: { type: ["string", "null"], format: "uri" },
  }),
  InventoryResaleAnalysisSnapshot: objectSchema(
    [
      "dealRiskScore",
      "generatedAt",
      "provider",
      "riskLevel",
      "suggestedDescription",
      "summary",
      "topics",
    ],
    {
      dealRiskScore: { type: "number", minimum: 0, maximum: 100 },
      generatedAt: { type: "string", format: "date-time" },
      provider: objectSchema(["model", "name"], {
        model: { type: "string" },
        name: { type: "string" },
      }),
      riskLevel: { type: "string", enum: ["low", "medium", "high"] },
      suggestedDescription: { type: "string" },
      summary: { type: "string" },
      topics: { type: "array", items: { type: "object" } },
    },
  ),
} as const;
