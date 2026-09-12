import {
  createUploadedDocumentOperation,
  documentUploadPaths,
  documentUploadSchemas,
} from "./documentUploadOpenApi.js";
import {
  documentTemplatePaths,
  documentTemplateSchemas,
} from "./documentTemplateOpenApi.js";

export const documentsSchemas = {
  DocumentWorkspaceItem: {
    type: "object",
    additionalProperties: false,
    required: [
      "capabilities",
      "context",
      "createdAt",
      "file",
      "id",
      "kind",
      "metadata",
      "status",
      "title",
      "updatedAt",
      "uploadedAt",
    ],
    properties: {
      capabilities: {
        type: "object",
        additionalProperties: false,
        required: ["canRegenerate", "regenerateBlockReason"],
        properties: {
          canRegenerate: { type: "boolean" },
          regenerateBlockReason: {
            type: ["string", "null"],
            enum: ["document_state_unsupported", "renderer_unavailable", null],
          },
        },
      },
      context: {
        type: "object",
        additionalProperties: false,
        required: ["linkRole", "targetId", "targetType"],
        properties: {
          linkRole: { type: "string" },
          targetId: { type: "string" },
          targetType: { type: "string" },
        },
      },
      createdAt: { type: "string", format: "date-time" },
      file: {
        type: "object",
        additionalProperties: false,
        required: ["fileName", "fileSizeBytes", "mimeType"],
        properties: {
          fileName: { type: "string" },
          fileSizeBytes: { type: ["integer", "null"] },
          mimeType: { type: ["string", "null"] },
        },
      },
      id: { type: "string" },
      kind: { type: "string" },
      metadata: { type: "object", additionalProperties: true },
      status: { type: "string" },
      title: { type: "string" },
      updatedAt: { type: "string", format: "date-time" },
      uploadedAt: { type: "string", format: "date-time" },
    },
  },
  DocumentsWorkspaceResponse: {
    type: "object",
    additionalProperties: false,
    required: ["documents", "limit", "offset", "total"],
    properties: {
      documents: {
        type: "array",
        items: { $ref: "#/components/schemas/DocumentWorkspaceItem" },
      },
      limit: { type: "integer", minimum: 1, maximum: 200 },
      offset: { type: "integer", minimum: 0 },
      total: { type: "integer", minimum: 0 },
    },
  },
  ...documentTemplateSchemas,
  ...documentUploadSchemas,
} as const;

export const documentsPaths = {
  "/api/v1/documents": {
    get: {
      tags: ["Documents"],
      summary: "List shared documents workspace",
      operationId: "listDocumentsWorkspace",
      security: [{ bearerAuth: ["documents.read"] }],
      parameters: [
        optionalQuery("dateFrom", { type: "string", format: "date" }),
        optionalQuery("dateTo", { type: "string", format: "date" }),
        optionalQuery("kind"),
        optionalQuery("origin", {
          type: "string",
          enum: ["automatic", "manual"],
        }),
        optionalQuery("scope", {
          type: "string",
          enum: ["general", "vehicle"],
        }),
        optionalQuery("status"),
        optionalQuery("targetType"),
        optionalQuery("targetId"),
        optionalQuery("search"),
        {
          in: "query",
          name: "limit",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 200, default: 100 },
        },
        {
          in: "query",
          name: "offset",
          required: false,
          schema: { type: "integer", minimum: 0, default: 0 },
        },
      ],
      responses: {
        "200": {
          description: "Shared documents linked to store-scoped entities.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DocumentsWorkspaceResponse",
              },
            },
          },
        },
        "400": { description: "Request query is invalid." },
        "401": { description: "Authentication is required." },
        "403": { description: "documents.read permission is required." },
      },
    },
    post: createUploadedDocumentOperation,
  },
  ...documentUploadPaths,
  ...documentTemplatePaths,
} as const;

function optionalQuery(
  name: string,
  schema: Record<string, unknown> = { type: "string" },
) {
  return {
    in: "query",
    name,
    required: false,
    schema,
  };
}
