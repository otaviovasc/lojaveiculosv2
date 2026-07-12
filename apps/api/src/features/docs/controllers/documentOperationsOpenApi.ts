export const documentOperationSchemas = {
  DocumentPreview: {
    type: "object",
    additionalProperties: false,
    required: ["document", "generatedAt", "sections"],
    properties: {
      document: { $ref: "#/components/schemas/DocumentWorkspaceItem" },
      generatedAt: { type: "string", format: "date-time" },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["heading", "lines"],
          properties: {
            heading: { type: "string" },
            lines: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  VoidDocumentRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      reason: { type: "string", minLength: 1, maxLength: 400 },
    },
  },
  DocumentDownload: {
    type: "object",
    additionalProperties: false,
    required: [
      "document",
      "downloadMethod",
      "downloadUrl",
      "expiresAt",
      "fileName",
      "mimeType",
      "versionId",
      "versionNumber",
    ],
    properties: {
      document: { $ref: "#/components/schemas/DocumentWorkspaceItem" },
      downloadMethod: { type: "string", enum: ["GET"] },
      downloadUrl: { type: "string", format: "uri" },
      expiresAt: { type: "string", format: "date-time" },
      fileName: { type: "string" },
      mimeType: { type: ["string", "null"] },
      versionId: { type: "string" },
      versionNumber: { type: "integer", minimum: 1 },
    },
  },
  DocumentVersion: {
    type: "object",
    additionalProperties: false,
    required: ["createdAt", "file", "id", "metadata", "versionNumber"],
    properties: {
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
      metadata: { type: "object", additionalProperties: true },
      versionNumber: { type: "integer", minimum: 1 },
    },
  },
  DocumentVersionsResponse: {
    type: "object",
    additionalProperties: false,
    required: ["versions"],
    properties: {
      versions: {
        type: "array",
        items: { $ref: "#/components/schemas/DocumentVersion" },
      },
    },
  },
} as const;

const commonResponses = {
  "401": { description: "Authentication is required." },
  "403": { description: "Document operation permission is required." },
  "404": { description: "Document was not found in current store scope." },
  "409": { description: "Document state does not allow this operation." },
} as const;

const documentMutationResponses = {
  "200": {
    description: "Updated document.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/DocumentWorkspaceItem" },
      },
    },
  },
  ...commonResponses,
} as const;

const documentOperationParameters = [
  {
    in: "path",
    name: "documentId",
    required: true,
    schema: { type: "string" },
  },
] as const;

export const documentOperationPaths = {
  "/api/v1/documents/{documentId}/preview": {
    get: documentOperation("previewDocument", "Preview document", [
      "documents.preview",
    ]),
  },
  "/api/v1/documents/{documentId}/download": {
    get: {
      ...documentOperation("downloadDocument", "Download document", [
        "documents.download",
      ]),
      responses: {
        "200": {
          description: "Authorized document download descriptor.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentDownload" },
            },
          },
        },
        ...commonResponses,
      },
      parameters: [
        ...documentOperationParameters,
        {
          in: "query",
          name: "versionId",
          required: false,
          schema: { type: "string" },
        },
      ],
    },
  },
  "/api/v1/documents/{documentId}/versions": {
    get: {
      ...documentOperation("listDocumentVersions", "List document versions", [
        "documents.read",
      ]),
      responses: {
        "200": {
          description: "Immutable document versions in newest-first order.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentVersionsResponse" },
            },
          },
        },
        ...commonResponses,
      },
    },
  },
  "/api/v1/documents/{documentId}/regenerate": {
    post: {
      ...documentOperation(
        "regenerateDocument",
        "Regenerate document with its registered renderer",
        ["documents.regenerate"],
      ),
      responses: documentMutationResponses,
    },
  },
  "/api/v1/documents/{documentId}/void": {
    post: {
      ...documentOperation("voidDocument", "Void document", ["documents.void"]),
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VoidDocumentRequest" },
          },
        },
      },
      responses: documentMutationResponses,
    },
  },
} as const;

function documentOperation(
  operationId: string,
  summary: string,
  scopes: string[],
) {
  return {
    tags: ["Documents"],
    summary,
    operationId,
    security: [{ bearerAuth: scopes }],
    parameters: documentOperationParameters,
    responses:
      operationId === "previewDocument"
        ? {
            "200": {
              description: "Rendered document preview.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DocumentPreview" },
                },
              },
            },
            ...commonResponses,
          }
        : documentMutationResponses,
  };
}
