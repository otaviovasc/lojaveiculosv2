export const fiscalSchemas = {
  FiscalOverview: {
    type: "object",
    additionalProperties: true,
    properties: {
      documents: { type: "array", items: { type: "object" } },
      provider: { type: "object", additionalProperties: true },
      summary: { type: "object", additionalProperties: true },
    },
  },
  FiscalRecipient: { type: "object", additionalProperties: true },
  FiscalServiceInvoiceTemplate: { type: "object", additionalProperties: true },
  FiscalTemplatePreview: { type: "object", additionalProperties: true },
} as const;

export const fiscalPaths = {
  "/api/v1/fiscal/overview": {
    get: {
      tags: ["Fiscal"],
      summary: "Read fiscal provider and NF-e document overview",
      operationId: "getFiscalOverview",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Fiscal overview.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FiscalOverview" },
            },
          },
        },
      },
    },
  },
  "/api/v1/fiscal/documents": {
    post: {
      tags: ["Fiscal"],
      summary: "Create one fiscal document issue attempt",
      operationId: "issueFiscalDocument",
      security: [{ bearerAuth: [] }],
      responses: {
        "201": {
          description:
            "Fiscal document created or failed with provider status.",
        },
      },
    },
  },
  "/api/v1/fiscal/documents/{documentId}/artifacts/{format}": {
    get: {
      tags: ["Fiscal", "Documents"],
      summary: "Download an official fiscal document artifact",
      description:
        "Returns the provider-backed PDF or XML artifact only when the scoped fiscal document has an eligible official status. No synthetic artifact is generated.",
      operationId: "downloadFiscalDocumentArtifact",
      security: [{ bearerAuth: ["fiscal.manage", "documents.download"] }],
      parameters: [
        {
          in: "path",
          name: "documentId",
          required: true,
          schema: { type: "string" },
        },
        {
          in: "path",
          name: "format",
          required: true,
          schema: { type: "string", enum: ["pdf", "xml"] },
        },
      ],
      responses: {
        "200": {
          description: "Official provider-backed fiscal artifact.",
          headers: {
            "Cache-Control": { schema: { type: "string" } },
            "Content-Disposition": { schema: { type: "string" } },
          },
          content: {
            "application/pdf": {
              schema: { type: "string", format: "binary" },
            },
            "application/xml": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        "400": { description: "Artifact format or request scope is invalid." },
        "401": { description: "Authentication is required." },
        "403": {
          description:
            "fiscal.manage and documents.download permissions are required.",
        },
        "404": { description: "Fiscal document was not found in store scope." },
        "409": {
          description:
            "The official provider artifact is not available for this document.",
        },
        "503": { description: "The fiscal provider is unavailable." },
      },
    },
  },
  "/api/v1/fiscal/recipients": {
    get: {
      tags: ["Fiscal"],
      summary: "List NFS-e service recipients for the current store",
      operationId: "listFiscalRecipients",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal recipients." } },
    },
    post: {
      tags: ["Fiscal"],
      summary: "Create one NFS-e service recipient",
      operationId: "createFiscalRecipient",
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Fiscal recipient created." } },
    },
  },
  "/api/v1/fiscal/recipients/{recipientId}": {
    patch: {
      tags: ["Fiscal"],
      summary: "Update one NFS-e service recipient",
      operationId: "updateFiscalRecipient",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal recipient updated." } },
    },
    delete: {
      tags: ["Fiscal"],
      summary: "Archive one NFS-e service recipient",
      operationId: "archiveFiscalRecipient",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal recipient archived." } },
    },
  },
  "/api/v1/fiscal/templates": {
    get: {
      tags: ["Fiscal"],
      summary: "List NFS-e service invoice templates",
      operationId: "listFiscalTemplates",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal templates." } },
    },
    post: {
      tags: ["Fiscal"],
      summary: "Create one NFS-e service invoice template",
      operationId: "createFiscalTemplate",
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Fiscal template created." } },
    },
  },
  "/api/v1/fiscal/templates/{templateId}": {
    patch: {
      tags: ["Fiscal"],
      summary: "Update one NFS-e service invoice template",
      operationId: "updateFiscalTemplate",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal template updated." } },
    },
    delete: {
      tags: ["Fiscal"],
      summary: "Archive one NFS-e service invoice template",
      operationId: "archiveFiscalTemplate",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Fiscal template archived." } },
    },
  },
  "/api/v1/fiscal/templates/preview": {
    post: {
      tags: ["Fiscal"],
      summary: "Preview one NFS-e template rendered with safe variables",
      operationId: "previewFiscalTemplate",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Rendered fiscal template preview." },
      },
    },
  },
  "/api/v1/fiscal/documents/{documentId}/cancel": {
    post: {
      tags: ["Fiscal"],
      summary: "Create one fiscal document cancellation attempt",
      operationId: "cancelFiscalDocument",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "documentId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { "200": { description: "Fiscal document status updated." } },
    },
  },
  "/api/v1/fiscal/documents/{documentId}/repeat": {
    post: {
      tags: ["Fiscal"],
      summary: "Create a reviewed draft from a prior fiscal document",
      operationId: "repeatFiscalDocument",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "documentId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { "201": { description: "Repeat draft created." } },
    },
  },
  "/api/v1/fiscal/documents/{documentId}/status-sync": {
    post: {
      tags: ["Fiscal"],
      summary: "Synchronize one fiscal document status",
      operationId: "syncFiscalDocumentStatus",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "path",
          name: "documentId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { "200": { description: "Fiscal document status synced." } },
    },
  },
} as const;
