export const listingIdParameter = {
  name: "listingId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Inventory listing identifier.",
} as const;

export const unitIdParameter = {
  name: "unitId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Inventory unit identifier.",
} as const;

export const mediaIdParameter = {
  name: "mediaId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Vehicle media identifier.",
} as const;

export const checklistIdParameter = {
  name: "checklistId",
  in: "path",
  required: true,
  schema: { type: "string", minLength: 1 },
  description: "Vehicle checklist identifier.",
} as const;

export const detailResponse = {
  description: "Canonical V2 inventory listing detail.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/InventoryListingDetail" },
    },
  },
} as const;

export const listResponse = {
  description: "Canonical V2 inventory stock list.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/InventoryListingList" },
    },
  },
} as const;

export const unitListResponse = {
  description: "Canonical V2 inventory unit list.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/InventoryUnitList" },
    },
  },
} as const;

export const mediaCreatedResponse = {
  description: "Created vehicle media response.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleMediaCreated" },
    },
  },
} as const;

export const mediaUploadResponse = {
  description: "Presigned upload instructions for vehicle media.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/VehicleMediaUpload" },
    },
  },
} as const;

export const authResponses = {
  "401": { description: "Authentication is missing or invalid." },
  "403": { description: "Authenticated actor lacks the required scope." },
} as const;

export const validationResponse = {
  "400": {
    description: "Request body is invalid.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
} as const;

export function queryParameter(name: "limit" | "offset" | "search" | "status") {
  return {
    name,
    in: "query",
    required: false,
    schema: { type: ["limit", "offset"].includes(name) ? "integer" : "string" },
  } as const;
}
