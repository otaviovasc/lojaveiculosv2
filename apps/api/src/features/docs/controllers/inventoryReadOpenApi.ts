import {
  authResponses,
  detailResponse,
  listingIdParameter,
  queryParameter,
  unitListResponse,
  validationResponse,
} from "./inventoryOpenApiParts.js";

export const inventoryReadPaths = {
  "/api/v1/inventory/units": {
    get: {
      tags: ["Inventory"],
      summary: "List inventory units",
      description:
        "Returns one inventory row per vehicle unit. Listings remain the commercial grouping; units are the stock objects shown on the inventory page.",
      operationId: "listInventoryUnits",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [
        queryParameter("search"),
        queryParameter("status"),
        queryParameter("limit"),
        queryParameter("offset"),
      ],
      responses: {
        "200": unitListResponse,
        ...validationResponse,
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/audit-events": {
    get: {
      tags: ["Inventory"],
      summary: "List vehicle audit events",
      description:
        "Returns real scoped audit events for the listing and its persisted child entities.",
      operationId: "listInventoryListingAuditEvents",
      security: [{ bearerAuth: ["inventory.read"] }],
      parameters: [listingIdParameter],
      responses: {
        "200": {
          description: "Vehicle-scoped audit events.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["events"],
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      required: [
                        "action",
                        "actorId",
                        "actorKind",
                        "changes",
                        "id",
                        "occurredAt",
                        "outcome",
                      ],
                      properties: {
                        action: { type: "string" },
                        actorId: { type: "string" },
                        actorKind: {
                          type: "string",
                          enum: ["user", "system", "public", "integration"],
                        },
                        category: { type: ["string", "null"] },
                        changes: { type: "array", items: { type: "object" } },
                        id: { type: "string" },
                        occurredAt: { type: "string", format: "date-time" },
                        outcome: {
                          type: "string",
                          enum: ["attempted", "succeeded", "failed", "denied"],
                        },
                        providerName: { type: ["string", "null"] },
                        summary: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ...authResponses,
      },
    },
  },
  "/api/v1/inventory/listings/{listingId}/resale-analysis": {
    post: {
      tags: ["Inventory"],
      summary: "Generate and persist resale analysis",
      description:
        "Generates a provider-identified resale analysis from authoritative listing data and persists the latest snapshot.",
      operationId: "analyzeInventoryListingResale",
      security: [{ bearerAuth: ["inventory.resale_analysis_generate"] }],
      parameters: [listingIdParameter],
      responses: {
        "200": detailResponse,
        ...authResponses,
      },
    },
  },
} as const;
