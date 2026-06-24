import { inventoryFinanceSchemas } from "./inventoryFinanceOpenApiSchemas.js";
import {
  listingTechnicalSchemas,
  objectSchema,
  unitIdentitySchemas,
  vehicleDocumentKinds,
} from "./inventoryOpenApiSchemaParts.js";

export const inventorySchemas = {
  AttachListingUnitRequest: objectSchema([], {
    ...unitIdentitySchemas,
  }),
  ChangeListingStatusRequest: objectSchema(["status"], {
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
  }),
  CreateListingRequest: objectSchema(["title"], {
    description: { type: ["string", "null"], minLength: 1 },
    ...listingTechnicalSchemas,
    plate: { type: ["string", "null"], minLength: 1, default: null },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
    title: { type: "string", minLength: 1 },
  }),
  CreateVehicleMediaRequest: objectSchema(["storageKey"], {
    altText: { type: ["string", "null"], minLength: 1, maxLength: 191 },
    displayOrder: { type: "integer", minimum: 0 },
    kind: {
      type: "string",
      enum: ["document_preview", "photo", "video"],
      default: "photo",
    },
    storageKey: { type: "string", minLength: 1 },
  }),
  ...inventoryFinanceSchemas,
  InventoryBuyer: objectSchema(["name"], {
    address: { type: ["string", "null"], minLength: 1 },
    document: { type: ["string", "null"], minLength: 1 },
    email: { type: ["string", "null"], format: "email" },
    name: { type: "string", minLength: 1 },
    phone: { type: ["string", "null"], minLength: 1 },
  }),
  InventoryListing: objectSchema(["id", "status", "title"], {
    createdAt: { type: "string", format: "date-time" },
    description: { type: ["string", "null"] },
    ...listingTechnicalSchemas,
    id: { type: "string" },
    plate: { type: ["string", "null"] },
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
    title: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
    unitIds: { type: "array", items: { type: "string" } },
  }),
  InventoryListingDetail: objectSchema(
    ["documents", "listing", "media", "status", "units"],
    {
      documents: {
        type: "array",
        items: { $ref: "#/components/schemas/VehicleDocument" },
      },
      listing: { $ref: "#/components/schemas/InventoryListing" },
      media: { type: "array", items: { type: "object" } },
      status: { type: "string", enum: ["ready"] },
      units: { type: "array", items: { type: "object" } },
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
    ["listing", "mediaCount", "primaryMediaUrl", "primaryUnit"],
    {
      listing: { $ref: "#/components/schemas/InventoryListing" },
      mediaCount: { type: "integer", minimum: 0 },
      primaryMediaUrl: { type: ["string", "null"] },
      primaryUnit: { type: ["object", "null"] },
    },
  ),
  RequestVehicleMediaUploadRequest: objectSchema(
    ["contentType", "fileName", "sizeBytes"],
    {
      contentType: { type: "string", minLength: 1, maxLength: 120 },
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      kind: {
        type: "string",
        enum: ["document_preview", "photo", "video"],
        default: "photo",
      },
      sizeBytes: { type: "integer", minimum: 1, maximum: 26214400 },
    },
  ),
  ReserveVehicleListingRequest: objectSchema(
    ["buyer", "signalAmountCents", "unitId"],
    {
      buyer: { $ref: "#/components/schemas/InventoryBuyer" },
      paymentMethod: { type: "string", minLength: 1, default: "pix" },
      reason: { type: ["string", "null"], minLength: 1 },
      salePriceCents: { type: ["integer", "null"], minimum: 1 },
      signalAmountCents: { type: "integer", minimum: 1 },
      unitId: { type: "string", minLength: 1 },
    },
  ),
  SellVehicleListingRequest: objectSchema(["buyer", "unitId"], {
    buyer: { $ref: "#/components/schemas/InventoryBuyer" },
    paidAmountCents: { type: ["integer", "null"], minimum: 1 },
    paymentMethod: { type: "string", minLength: 1, default: "pix" },
    reason: { type: ["string", "null"], minLength: 1 },
    salePriceCents: { type: ["integer", "null"], minimum: 1 },
    unitId: { type: "string", minLength: 1 },
  }),
  UpdateListingDescriptionRequest: objectSchema(["description"], {
    description: { type: "string", minLength: 1 },
  }),
  UpdateListingDetailsRequest: objectSchema([], {
    description: { type: ["string", "null"], minLength: 1 },
    ...listingTechnicalSchemas,
    priceCents: { type: ["integer", "null"], minimum: 0 },
    status: {
      type: "string",
      enum: ["draft", "available", "reserved", "sold", "inactive"],
    },
    title: { type: "string", minLength: 1 },
  }),
  UpdateListingPriceRequest: objectSchema(["priceCents"], {
    priceCents: { type: ["integer", "null"], minimum: 0 },
  }),
  UpdateListingUnitRequest: objectSchema([], {
    colorName: unitIdentitySchemas.colorName,
    plate: unitIdentitySchemas.plate,
    status: {
      type: "string",
      enum: ["available", "reserved", "sold", "retired"],
    },
    stockNumber: unitIdentitySchemas.stockNumber,
    vin: unitIdentitySchemas.vin,
  }),
  VehicleMediaCreated: objectSchema(["mediaId", "status", "url"], {
    mediaId: { type: "string" },
    status: { type: "string", enum: ["created"] },
    url: { type: "string" },
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
  VehicleMediaUpload: objectSchema(
    [
      "expiresAt",
      "publicUrl",
      "storageKey",
      "uploadHeaders",
      "uploadMethod",
      "uploadUrl",
    ],
    {
      expiresAt: { type: "string", format: "date-time" },
      publicUrl: { type: "string" },
      storageKey: { type: "string" },
      uploadHeaders: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      uploadMethod: { type: "string", enum: ["PUT"] },
      uploadUrl: { type: "string" },
    },
  ),
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
