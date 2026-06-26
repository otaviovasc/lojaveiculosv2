import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const inventoryMediaSchemas = {
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
  RequestVehicleDocumentUploadRequest: objectSchema(
    ["contentType", "fileName", "kind", "sizeBytes"],
    {
      contentType: { type: "string", minLength: 1, maxLength: 120 },
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      kind: { $ref: "#/components/schemas/VehicleDocumentKind" },
      sizeBytes: { type: "integer", minimum: 1, maximum: 26214400 },
    },
  ),
  AttachVehicleDocumentRequest: objectSchema(
    ["fileName", "kind", "storageKey", "title"],
    {
      fileName: { type: "string", minLength: 1, maxLength: 191 },
      fileSizeBytes: { type: ["integer", "null"], minimum: 1 },
      kind: { $ref: "#/components/schemas/VehicleDocumentKind" },
      linkRole: { type: "string", minLength: 1, maxLength: 80 },
      mimeType: { type: ["string", "null"], minLength: 1, maxLength: 120 },
      storageKey: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1, maxLength: 191 },
    },
  ),
  ReorderVehicleMediaRequest: objectSchema(["items"], {
    items: {
      type: "array",
      minItems: 1,
      items: objectSchema(["displayOrder", "mediaId"], {
        displayOrder: { type: "integer", minimum: 0 },
        mediaId: { type: "string", minLength: 1 },
      }),
    },
  }),
  UpdateVehicleMediaRequest: objectSchema([], {
    altText: { type: ["string", "null"], minLength: 1, maxLength: 191 },
    displayOrder: { type: "integer", minimum: 0 },
    isPublic: { type: "boolean" },
  }),
  VehicleMediaCreated: objectSchema(["mediaId", "status", "unitId", "url"], {
    mediaId: { type: "string" },
    status: { type: "string", enum: ["created"] },
    unitId: { type: "string" },
    url: { type: "string" },
  }),
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
