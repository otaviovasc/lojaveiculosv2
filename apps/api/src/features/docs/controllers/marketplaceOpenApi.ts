export const marketplaceSchemas = {
  MarketplaceOverview: {
    type: "object",
    additionalProperties: true,
    required: ["accounts", "jobs", "providers", "storeId", "tenantId"],
    properties: {
      accounts: { type: "array", items: { type: "object" } },
      jobs: { type: "array", items: { type: "object" } },
      providers: {
        type: "array",
        items: { type: "string", enum: ["olx", "mercado_livre"] },
      },
      storeId: { type: "string" },
      tenantId: { type: "string" },
    },
  },
} as const;

export const marketplacePaths = {
  "/api/v1/marketplaces/overview": {
    get: {
      tags: ["Marketplaces"],
      summary: "Read marketplace integration overview",
      operationId: "getMarketplaceOverview",
      security: [{ bearerAuth: ["marketplace.read"] }],
      responses: {
        "200": {
          description: "OLX/Mercado Livre account status and recent sync jobs.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarketplaceOverview" },
            },
          },
        },
      },
    },
  },
  "/api/v1/marketplaces/connect-url": {
    post: {
      tags: ["Marketplaces"],
      summary: "Create provider OAuth authorization URL",
      operationId: "createMarketplaceConnectUrl",
      security: [{ bearerAuth: ["marketplace.manage"] }],
      responses: {
        "200": {
          description:
            "Provider authorization URL for OLX or Mercado Livre account connection.",
        },
        "400": { description: "Provider gateway is not configured." },
      },
    },
  },
  "/api/v1/marketplaces/oauth/complete": {
    post: {
      tags: ["Marketplaces"],
      summary: "Complete provider OAuth connection",
      operationId: "completeMarketplaceConnection",
      security: [{ bearerAuth: ["marketplace.manage"] }],
      responses: {
        "200": {
          description:
            "Connected marketplace account with encrypted provider credentials.",
        },
      },
    },
  },
  "/api/v1/marketplaces/integrations/{provider}": {
    put: {
      tags: ["Marketplaces"],
      summary: "Create or update one marketplace connection",
      operationId: "upsertMarketplaceIntegration",
      security: [{ bearerAuth: ["marketplace.manage"] }],
      parameters: [providerParameter()],
      responses: {
        "200": { description: "Updated marketplace account." },
      },
    },
  },
  "/api/v1/marketplaces/integrations/{provider}/sync-jobs": {
    post: {
      tags: ["Marketplaces"],
      summary: "Queue a marketplace sync job",
      operationId: "createMarketplaceSyncJob",
      security: [{ bearerAuth: ["marketplace.inventory_sync"] }],
      parameters: [providerParameter()],
      responses: {
        "200": { description: "Queued sync job." },
        "400": { description: "Provider connection is missing." },
      },
    },
  },
  "/api/v1/marketplaces/integrations/{provider}/stock-sync/preview": {
    post: {
      tags: ["Marketplaces"],
      summary: "Preview marketplace stock synchronization",
      operationId: "previewMarketplaceStockSync",
      security: [{ bearerAuth: ["marketplace.inventory_sync"] }],
      parameters: [providerParameter()],
      responses: {
        "200": {
          description:
            "Stock sync batch id and per-listing publish/update/unpublish/no-op/blocker plan.",
        },
        "400": { description: "Invalid provider, body, or listing metadata." },
        "403": {
          description: "Missing marketplace entitlement or sync permission.",
        },
      },
    },
  },
  "/api/v1/marketplaces/integrations/{provider}/stock-sync/run": {
    post: {
      tags: ["Marketplaces"],
      summary: "Queue and run marketplace stock synchronization",
      operationId: "runMarketplaceStockSync",
      security: [{ bearerAuth: ["marketplace.inventory_sync"] }],
      parameters: [providerParameter()],
      responses: {
        "200": {
          description:
            "Created sync jobs after planning, ran provider listing calls synchronously, and returned job statuses.",
        },
        "400": {
          description:
            "Stable marketplace error such as account not connected, invalid metadata, or provider validation failure.",
        },
        "403": {
          description: "Missing marketplace entitlement or listing permission.",
        },
      },
    },
  },
  "/api/v1/marketplaces/sync-jobs/{jobId}/retry": {
    post: {
      tags: ["Marketplaces"],
      summary: "Retry a failed marketplace sync job",
      operationId: "retryMarketplaceSyncJob",
      security: [{ bearerAuth: ["marketplace.inventory_sync"] }],
      parameters: [
        {
          in: "path",
          name: "jobId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description:
            "Queued and ran a retry job with sanitized metadata linked to the previous failed job.",
        },
        "400": { description: "Previous job metadata is invalid." },
        "409": { description: "Previous job is not retryable." },
      },
    },
  },
  "/api/v1/marketplaces/sync-jobs/{jobId}/run": {
    post: {
      tags: ["Marketplaces"],
      summary: "Run one queued marketplace sync job",
      operationId: "runMarketplaceSyncJob",
      security: [{ bearerAuth: ["marketplace.inventory_sync"] }],
      parameters: [
        {
          in: "path",
          name: "jobId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description:
            "Ran the provider call and marked the job succeeded or failed. Listing publish/update sync fails closed before provider IO unless the projection is not deleted, published, public-visible, backed by an eligible unit, and has at least one public photo. Listing unpublish can run from the stored provider external id after the local listing projection is gone.",
        },
      },
    },
  },
} as const;

function providerParameter() {
  return {
    in: "path",
    name: "provider",
    required: true,
    schema: { type: "string", enum: ["olx", "mercado_livre"] },
  };
}
