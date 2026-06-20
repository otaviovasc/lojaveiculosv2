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
