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
  "/api/v1/inventory/units/{unitId}/ai-studio/generations": {
    post: {
      tags: ["Inventory"],
      summary: "Generate AI studio image preview",
      description:
        "Generates a Hedra-powered studio image from existing unit media and stores the preview object under the scoped vehicle media folder.",
      operationId: "generateInventoryAiStudioImage",
      security: [{ bearerAuth: ["inventory.ai_studio_generate"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("AiStudioGenerationRequest"),
      responses: {
        "201": {
          description: "AI studio generation preview.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AiStudioGenerationResponse",
              },
            },
          },
        },
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/ai-studio/approvals": {
    post: {
      tags: ["Inventory"],
      summary: "Approve AI studio image",
      description:
        "Attaches a generated AI studio object to the vehicle gallery as public photo media.",
      operationId: "approveInventoryAiStudioImage",
      security: [{ bearerAuth: ["inventory.ai_studio_generate"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("AiStudioApprovalRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
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
      security: [{ bearerAuth: ["inventory.media_update"] }],
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
      security: [{ bearerAuth: ["inventory.media_update"] }],
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
      description:
        "Soft-deletes one unit media record, requests backing object cleanup when storage supports it, and returns the updated listing detail.",
      operationId: "deleteInventoryUnitMedia",
      security: [{ bearerAuth: ["inventory.media_delete"] }],
      parameters: [unitIdParameter, mediaIdParameter],
      responses: {
        "200": detailResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/documents/uploads": {
    post: {
      tags: ["Inventory"],
      summary: "Request unit document upload URL",
      operationId: "requestInventoryUnitDocumentUpload",
      security: [{ bearerAuth: ["inventory.document_attach"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("RequestVehicleDocumentUploadRequest"),
      responses: {
        "201": mediaUploadResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/units/{unitId}/documents": {
    post: {
      tags: ["Inventory"],
      summary: "Attach uploaded document to unit",
      operationId: "attachInventoryUnitDocument",
      security: [{ bearerAuth: ["inventory.document_attach"] }],
      parameters: [unitIdParameter],
      requestBody: jsonRequest("AttachVehicleDocumentRequest"),
      responses: {
        "201": detailResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
} as const;
