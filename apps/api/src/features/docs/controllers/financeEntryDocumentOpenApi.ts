import {
  entryIdParameter,
  financeDocumentIdParameter,
  operation,
  query,
} from "./financeOpenApiParts.js";
import { objectSchema } from "./inventoryOpenApiSchemaParts.js";

export const financeEntryDocumentPaths = {
  "/api/v1/finance/entries/{entryId}/documents/{documentId}/download": {
    get: {
      ...operation(
        "finance.read",
        "Download finance entry document",
        "downloadFinanceEntryDocument",
        "FinanceEntryDocumentDownloadResponse",
      ),
      parameters: [
        entryIdParameter,
        financeDocumentIdParameter,
        query("disposition", "string"),
      ],
    },
  },
  "/api/v1/finance/entries/{entryId}/documents/{documentId}/content": {
    get: {
      tags: ["Finance"],
      summary: "Stream finance entry document content",
      operationId: "streamFinanceEntryDocumentContent",
      security: [{ bearerAuth: ["finance.read"] }],
      responses: {
        "200": {
          description: "Proxied finance entry document content stream.",
          content: {
            "application/octet-stream": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        "400": { description: "Request body or query is invalid." },
        "401": { description: "Authentication is required." },
        "403": { description: "finance.read permission is required." },
        "404": { description: "Finance entry was not found." },
      },
      parameters: [entryIdParameter, financeDocumentIdParameter],
    },
  },
} as const;

export const financeEntryDocumentSchemas = {
  FinanceEntryDocumentDownloadResponse: objectSchema(
    [
      "documentId",
      "downloadMethod",
      "downloadUrl",
      "expiresAt",
      "fileName",
      "mimeType",
    ],
    {
      documentId: { type: "string" },
      downloadMethod: { type: "string", enum: ["GET"] },
      downloadUrl: { type: "string" },
      expiresAt: { type: "string", format: "date-time" },
      fileName: { type: "string" },
      mimeType: { type: ["string", "null"] },
    },
  ),
} as const;
