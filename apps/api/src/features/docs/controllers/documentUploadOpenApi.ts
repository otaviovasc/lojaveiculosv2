export const documentUploadSchemas = {
  DocumentUploadRequest: {
    type: "object",
    additionalProperties: false,
    required: ["contentType", "fileName", "sizeBytes"],
    properties: {
      contentType: { type: "string" },
      fileName: { type: "string" },
      sizeBytes: { type: "integer", minimum: 1, maximum: 26214400 },
      targetId: { type: "string" },
      targetType: { type: "string" },
    },
  },
  DocumentUploadResponse: {
    type: "object",
    additionalProperties: false,
    required: [
      "expiresAt",
      "publicUrl",
      "storageKey",
      "uploadHeaders",
      "uploadMethod",
      "uploadUrl",
    ],
    properties: {
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
  },
  CreateUploadedDocumentRequest: {
    type: "object",
    additionalProperties: false,
    required: [
      "fileName",
      "fileSizeBytes",
      "kind",
      "mimeType",
      "storageKey",
      "title",
    ],
    properties: {
      fileName: { type: "string" },
      fileSizeBytes: { type: ["integer", "null"] },
      kind: { type: "string" },
      mimeType: { type: ["string", "null"] },
      storageKey: { type: "string" },
      targetId: { type: "string" },
      targetType: { type: "string" },
      title: { type: "string" },
    },
  },
  UpdateDocumentMetadataRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: { type: "string" },
      title: { type: "string" },
    },
  },
} as const;

export const documentUploadPaths = {
  "/api/v1/documents/uploads": {
    post: {
      tags: ["Documents"],
      summary: "Request signed document upload URL",
      operationId: "requestDocumentUpload",
      security: [{ bearerAuth: ["documents.upload"] }],
      requestBody: jsonRequest("DocumentUploadRequest"),
      responses: {
        "201": jsonResponse(
          "Scoped upload instructions.",
          "DocumentUploadResponse",
        ),
        "400": { description: "Request body is invalid." },
        "401": { description: "Authentication is required." },
        "403": { description: "documents.upload permission is required." },
      },
    },
  },
  "/api/v1/documents/{documentId}": {
    patch: {
      tags: ["Documents"],
      summary: "Update document title or kind",
      operationId: "updateDocumentMetadata",
      security: [{ bearerAuth: ["documents.update_metadata"] }],
      parameters: [pathDocumentId()],
      requestBody: jsonRequest("UpdateDocumentMetadataRequest"),
      responses: {
        "200": jsonResponse("Updated document.", "DocumentWorkspaceItem"),
        "400": { description: "Request body is invalid." },
        "401": { description: "Authentication is required." },
        "403": {
          description: "documents.update_metadata permission is required.",
        },
        "404": { description: "Document was not found." },
      },
    },
    delete: {
      tags: ["Documents"],
      summary: "Void a document from the workspace",
      operationId: "deleteDocument",
      security: [{ bearerAuth: ["documents.void"] }],
      parameters: [pathDocumentId()],
      responses: {
        "200": jsonResponse("Voided document.", "DocumentWorkspaceItem"),
        "401": { description: "Authentication is required." },
        "403": { description: "documents.void permission is required." },
        "404": { description: "Document was not found." },
      },
    },
  },
} as const;

export const createUploadedDocumentOperation = {
  tags: ["Documents"],
  summary: "Register an uploaded document",
  operationId: "createUploadedDocument",
  security: [{ bearerAuth: ["documents.upload"] }],
  requestBody: jsonRequest("CreateUploadedDocumentRequest"),
  responses: {
    "201": jsonResponse(
      "Registered uploaded document.",
      "DocumentWorkspaceItem",
    ),
    "400": { description: "Request body is invalid." },
    "401": { description: "Authentication is required." },
    "403": { description: "documents.upload permission is required." },
  },
} as const;

function jsonRequest(schemaName: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function jsonResponse(description: string, schemaName: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function pathDocumentId() {
  return {
    in: "path",
    name: "documentId",
    required: true,
    schema: { type: "string" },
  };
}
