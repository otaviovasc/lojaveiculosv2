import {
  createUploadedDocumentOperation,
  documentUploadPaths,
  documentUploadSchemas,
} from "./documentUploadOpenApi.js";

export const documentsSchemas = {
  DocumentWorkspaceItem: {
    type: "object",
    additionalProperties: false,
    required: [
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
    required: ["documents"],
    properties: {
      documents: {
        type: "array",
        items: { $ref: "#/components/schemas/DocumentWorkspaceItem" },
      },
    },
  },
  DocumentTemplate: {
    type: "object",
    additionalProperties: false,
    required: [
      "availableVariables",
      "clauses",
      "defaultClauses",
      "defaultTitle",
      "isCustomized",
      "kind",
      "title",
      "updatedAt",
    ],
    properties: {
      availableVariables: { type: "array", items: { type: "string" } },
      clauses: { type: "array", items: { type: "string" } },
      defaultClauses: { type: "array", items: { type: "string" } },
      defaultTitle: { type: "string" },
      isCustomized: { type: "boolean" },
      kind: { type: "string" },
      title: { type: "string" },
      updatedAt: { type: ["string", "null"], format: "date-time" },
    },
  },
  DocumentTemplatesResponse: {
    type: "object",
    additionalProperties: false,
    required: ["templates"],
    properties: {
      templates: {
        type: "array",
        items: { $ref: "#/components/schemas/DocumentTemplate" },
      },
    },
  },
  UpdateDocumentTemplateRequest: {
    type: "object",
    additionalProperties: false,
    required: ["clauses", "title"],
    properties: {
      clauses: { type: "array", items: { type: "string" }, minItems: 1 },
      title: { type: "string", minLength: 1 },
    },
  },
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
        optionalQuery("kind"),
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
  "/api/v1/documents/templates": {
    get: {
      tags: ["Documents"],
      summary: "List editable store document templates",
      operationId: "listDocumentTemplates",
      security: [{ bearerAuth: ["documents.read"] }],
      responses: {
        "200": {
          description: "Store-customizable templates with default clauses.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DocumentTemplatesResponse",
              },
            },
          },
        },
        "401": { description: "Authentication is required." },
        "403": { description: "documents.read permission is required." },
      },
    },
  },
  "/api/v1/documents/templates/{kind}": {
    put: {
      tags: ["Documents"],
      summary: "Update one store document template",
      operationId: "updateDocumentTemplate",
      security: [{ bearerAuth: ["documents.template_update"] }],
      parameters: [
        {
          in: "path",
          name: "kind",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateDocumentTemplateRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated document template.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentTemplate" },
            },
          },
        },
        "400": { description: "Request body or kind is invalid." },
        "401": { description: "Authentication is required." },
        "403": {
          description: "documents.template_update permission is required.",
        },
      },
    },
  },
} as const;

function optionalQuery(name: string) {
  return {
    in: "query",
    name,
    required: false,
    schema: { type: "string" },
  };
}
