import { inventoryFinanceSchemas } from "./inventoryFinanceOpenApiSchemas.js";
import { inventoryChecklistSchemas } from "./inventoryChecklistOpenApiSchemas.js";
import { inventoryAcquisitionSchemas } from "./inventoryAcquisitionOpenApiSchemas.js";
import { inventoryWorkflowSchemas } from "./inventoryWorkflowOpenApiSchemas.js";
import { inventoryMediaSchemas } from "./inventoryMediaOpenApiSchemas.js";
import {
  listingTechnicalSchemas,
  objectSchema,
  unitIdentitySchemas,
  vehicleDocumentKinds,
} from "./inventoryOpenApiSchemaParts.js";

const listingStatusEnum = [
  "archived",
  "draft",
  "in_preparation",
  "published",
  "sold_out",
  "unpublished",
] as const;

export const inventorySchemas = {
  AttachListingUnitRequest: objectSchema([], {
    ...unitIdentitySchemas,
  }),
  ChangeListingStatusRequest: objectSchema(["status"], {
    reason: { type: ["string", "null"], minLength: 1 },
    status: {
      type: "string",
      enum: listingStatusEnum,
    },
  }),
  CreateListingRequest: objectSchema(["title"], {
    description: { type: ["string", "null"], minLength: 1 },
    ...listingTechnicalSchemas,
    plate: { type: ["string", "null"], minLength: 1, default: null },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: ["draft", "in_preparation", "published", "unpublished"],
    },
    title: { type: "string", minLength: 1 },
  }),
  ...inventoryAcquisitionSchemas,
  ...inventoryChecklistSchemas,
  ...inventoryFinanceSchemas,
  ...inventoryMediaSchemas,
  ...inventoryWorkflowSchemas,
  InventoryListing: objectSchema(["id", "status", "title"], {
    createdAt: { type: "string", format: "date-time" },
    description: { type: ["string", "null"] },
    ...listingTechnicalSchemas,
    id: { type: "string" },
    isVisibleOnPublicSite: { type: "boolean" },
    plate: { type: ["string", "null"] },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    publicSlug: { type: ["string", "null"] },
    status: {
      type: "string",
      enum: listingStatusEnum,
    },
    title: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
    unitIds: { type: "array", items: { type: "string" } },
  }),
  InventoryUnit: objectSchema(["id", "listingId", "status"], {
    colorName: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    id: { type: "string" },
    listingId: { type: "string" },
    plate: { type: ["string", "null"] },
    status: {
      type: "string",
      enum: [
        "acquired",
        "available",
        "delivered",
        "inactive",
        "in_preparation",
        "reserved",
        "sold",
      ],
    },
    stockNumber: { type: ["string", "null"] },
    updatedAt: { type: "string", format: "date-time" },
    vin: { type: ["string", "null"] },
  }),
  InventoryListingDetail: objectSchema(
    ["checklists", "documents", "listing", "media", "status", "units"],
    {
      documents: {
        type: "array",
        items: { $ref: "#/components/schemas/VehicleDocument" },
      },
      checklists: {
        type: "array",
        items: { $ref: "#/components/schemas/VehicleChecklist" },
      },
      listing: { $ref: "#/components/schemas/InventoryListing" },
      media: { type: "array", items: { type: "object" } },
      status: { type: "string", enum: ["ready"] },
      units: {
        type: "array",
        items: { $ref: "#/components/schemas/InventoryUnit" },
      },
    },
  ),
  InventoryListingList: objectSchema(
    ["hasMore", "items", "nextOffset", "total"],
    {
      hasMore: { type: "boolean" },
      nextOffset: { type: ["integer", "null"], minimum: 0 },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/InventoryListingSummary" },
      },
      total: { type: "integer", minimum: 0 },
    },
  ),
  InventoryListingSummary: objectSchema(
    ["listing", "mediaCount", "primaryMediaUrl", "primaryUnit", "units"],
    {
      listing: { $ref: "#/components/schemas/InventoryListing" },
      mediaCount: { type: "integer", minimum: 0 },
      primaryMediaUrl: { type: ["string", "null"] },
      primaryUnit: {
        oneOf: [
          { $ref: "#/components/schemas/InventoryUnit" },
          { type: "null" },
        ],
      },
      unit: { $ref: "#/components/schemas/InventoryUnit" },
      units: {
        type: "array",
        items: { $ref: "#/components/schemas/InventoryUnit" },
      },
    },
  ),
  InventoryUnitList: objectSchema(["hasMore", "items", "nextOffset", "total"], {
    hasMore: { type: "boolean" },
    nextOffset: { type: ["integer", "null"], minimum: 0 },
    items: {
      type: "array",
      items: { $ref: "#/components/schemas/InventoryUnitSummary" },
    },
    total: { type: "integer", minimum: 0 },
  }),
  InventoryUnitSummary: objectSchema(
    [
      "listing",
      "mediaCount",
      "primaryMediaUrl",
      "primaryUnit",
      "unit",
      "units",
    ],
    {
      listing: { $ref: "#/components/schemas/InventoryListing" },
      mediaCount: { type: "integer", minimum: 0 },
      primaryMediaUrl: { type: ["string", "null"] },
      primaryUnit: { $ref: "#/components/schemas/InventoryUnit" },
      unit: { $ref: "#/components/schemas/InventoryUnit" },
      units: {
        type: "array",
        items: { $ref: "#/components/schemas/InventoryUnit" },
      },
    },
  ),
  UpdateListingDescriptionRequest: objectSchema(["description"], {
    description: { type: "string", minLength: 1 },
  }),
  UpdateListingDetailsRequest: objectSchema([], {
    description: { type: ["string", "null"], minLength: 1 },
    ...listingTechnicalSchemas,
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: [
        "archived",
        "draft",
        "in_preparation",
        "published",
        "sold_out",
        "unpublished",
      ],
    },
    title: { type: "string", minLength: 1 },
  }),
  UpdateListingPriceRequest: objectSchema(["priceCents"], {
    priceCents: { type: ["integer", "null"], minimum: 0 },
  }),
  UpdateVehicleUnitRequest: objectSchema([], {
    colorName: unitIdentitySchemas.colorName,
    plate: unitIdentitySchemas.plate,
    status: {
      type: "string",
      enum: [
        "acquired",
        "available",
        "delivered",
        "inactive",
        "in_preparation",
        "reserved",
        "sold",
      ],
    },
    stockNumber: unitIdentitySchemas.stockNumber,
    vin: unitIdentitySchemas.vin,
  }),
  VehicleDocument: objectSchema(["id", "kind", "status", "title"], {
    fileName: { type: "string" },
    id: { type: "string" },
    kind: { $ref: "#/components/schemas/VehicleDocumentKind" },
    linkRole: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
    status: {
      type: "string",
      enum: [
        "archived",
        "draft",
        "issued",
        "pending_signature",
        "signed",
        "voided",
      ],
    },
    title: { type: "string" },
  }),
  VehicleDocumentKind: {
    type: "string",
    enum: vehicleDocumentKinds,
    description:
      "Vehicle document kind, including reservation_receipt and sale bundle documents: sale_contract, sale_receipt, delivery_term, power_of_attorney.",
  },
} as const;

export function jsonRequest(schemaName: keyof typeof inventorySchemas) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  } as const;
}
