import { jsonRequest } from "./inventoryOpenApiSchemas.js";
import {
  authResponses,
  detailResponse,
  mediaIdParameter,
  mediaCreatedResponse,
  mediaUploadResponse,
  unitIdParameter,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryMediaPaths = {
  "/api/v1/inventory/units/{unitId}/media/uploads": {
    post: {
      tags: ["Inventory"],
      summary: "Request media upload URL",
      description:
        "Requests upload instructions for media owned by a vehicle unit.",
      operationId: "requestInventoryUnitMediaUpload",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("RequestVehicleMediaUploadRequest"),
      responses: {
        "201": mediaUploadResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/media": {
    post: {
      tags: ["Inventory"],
      summary: "Attach uploaded media to unit",
      operationId: "createInventoryUnitMedia",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("CreateVehicleMediaRequest"),
      responses: {
        "201": mediaCreatedResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/media/reorder": {
    patch: {
      tags: ["Inventory"],
      summary: "Reorder unit media",
      operationId: "reorderInventoryUnitMedia",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("ReorderVehicleMediaRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/media/{mediaId}": {
    patch: {
      tags: ["Inventory"],
      summary: "Update unit media",
      operationId: "updateInventoryUnitMedia",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [unitIdParameter, mediaIdParameter],
      requestBody: jsonRequest("UpdateVehicleMediaRequest"),
      responses: {
        "200": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
    delete: {
      tags: ["Inventory"],
      summary: "Delete unit media",
      operationId: "deleteInventoryUnitMedia",
      security: [{ bearerAuth: ["inventory.create"] }],
      parameters: [unitIdParameter, mediaIdParameter],
      responses: {
        "200": detailResponse,
        ...authResponses,
      },
    },
  },
} as const;
