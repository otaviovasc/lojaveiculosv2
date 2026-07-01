export const externalApiSchemas = {
  ExternalApiClient: {
    type: "object",
    additionalProperties: true,
    required: ["id", "name", "scopes", "status", "keyPrefixes"],
    properties: {
      id: { type: "string" },
      keyPrefixes: { type: "array", items: { type: "string" } },
      name: { type: "string" },
      scopes: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["active", "revoked", "suspended"] },
    },
  },
  CreatedExternalApiClient: {
    type: "object",
    additionalProperties: false,
    required: ["apiKey", "client"],
    properties: {
      apiKey: { type: "string" },
      client: { $ref: "#/components/schemas/ExternalApiClient" },
    },
  },
  ExternalApiLead: {
    type: "object",
    additionalProperties: true,
    required: ["buyer", "id", "listingId", "object", "source", "status"],
    properties: {
      buyer: {
        type: "object",
        properties: {
          email: { type: ["string", "null"] },
          name: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
        },
      },
      id: { type: "string" },
      listingId: { type: ["string", "null"] },
      object: { type: "string", const: "lead" },
      source: { type: "string" },
      status: { type: "string" },
    },
  },
  ExternalApiVehicle: {
    type: "object",
    additionalProperties: true,
    required: ["availability", "id", "media", "object", "status", "title"],
    properties: {
      availability: { type: "object", additionalProperties: true },
      catalog: { type: ["object", "null"], additionalProperties: true },
      id: { type: "string" },
      media: { type: "object", additionalProperties: true },
      object: { type: "string", const: "vehicle" },
      priceCents: { type: ["integer", "null"] },
      status: { type: "string" },
      title: { type: "string" },
    },
  },
} as const;

export const externalApiPaths = {
  "/api/v1/external-api/ai-tools": {
    get: {
      tags: ["External API"],
      summary: "Return AI tool definitions for public API builders",
      operationId: "getExternalApiAiTools",
      responses: { "200": { description: "OpenAI-compatible tool metadata." } },
    },
  },
  "/api/v1/external-api/clients": {
    get: {
      tags: ["External API"],
      summary: "List scoped API clients",
      operationId: "listExternalApiClients",
      security: [{ bearerAuth: ["external_api.manage"] }],
      responses: {
        "200": {
          description: "API clients for the current store.",
        },
      },
    },
    post: {
      tags: ["External API"],
      summary: "Create a scoped API client and one-time key",
      operationId: "createExternalApiClient",
      security: [{ bearerAuth: ["external_api.manage"] }],
      responses: {
        "201": {
          description: "Created client and one-time plaintext API key.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatedExternalApiClient" },
            },
          },
        },
      },
    },
  },
  "/api/v1/external-api/clients/{clientId}/revoke": {
    post: {
      tags: ["External API"],
      summary: "Revoke one API client and its active keys",
      operationId: "revokeExternalApiClient",
      security: [{ bearerAuth: ["external_api.manage"] }],
      parameters: [
        {
          in: "path",
          name: "clientId",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Revoked client." },
        "404": { description: "Client not found." },
      },
    },
  },
  "/api/v1/external-api/leads": {
    get: {
      tags: ["External API"],
      summary: "List CRM leads through a scoped external API key",
      operationId: "listExternalApiLeads",
      security: [{ externalApiKey: ["lead.read"] }],
      responses: { "200": { description: "Lead list with pagination." } },
    },
    post: {
      tags: ["External API"],
      summary: "Create a CRM lead from an external app or AI agent",
      operationId: "createExternalApiLead",
      security: [{ externalApiKey: ["lead.create"] }],
      parameters: [
        {
          in: "header",
          name: "Idempotency-Key",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "201": {
          description: "Created lead.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExternalApiLead" },
            },
          },
        },
      },
    },
  },
  "/api/v1/external-api/leads/{leadId}": {
    get: {
      tags: ["External API"],
      summary: "Read one CRM lead through a scoped external API key",
      operationId: "getExternalApiLead",
      security: [{ externalApiKey: ["lead.read"] }],
      responses: { "200": { description: "Lead detail." } },
    },
    patch: {
      tags: ["External API"],
      summary: "Update lead status or buyer contact fields",
      operationId: "updateExternalApiLead",
      security: [{ externalApiKey: ["lead.update"] }],
      parameters: [
        {
          in: "header",
          name: "Idempotency-Key",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { "200": { description: "Updated lead." } },
    },
  },
  "/api/v1/external-api/manifest": {
    get: {
      tags: ["External API"],
      summary: "Return public API manifest for humans, SDKs, and AI agents",
      operationId: "getExternalApiManifest",
      responses: { "200": { description: "Capability manifest." } },
    },
  },
  "/api/v1/external-api/vehicles": {
    get: {
      tags: ["External API"],
      summary: "List vehicles using a clean external DTO",
      operationId: "listExternalApiVehicles",
      security: [{ externalApiKey: ["inventory.read"] }],
      responses: {
        "200": {
          description: "Vehicle list.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExternalApiVehicle" },
            },
          },
        },
      },
    },
  },
  "/api/v1/external-api/vehicles/search": {
    get: {
      tags: ["External API"],
      summary: "Search vehicles with V1-compatible aliases and V2 filters",
      operationId: "searchExternalApiVehicles",
      security: [{ externalApiKey: ["inventory.read"] }],
      responses: { "200": { description: "Filtered vehicle list." } },
    },
  },
  "/api/v1/external-api/vehicles/{listingId}": {
    get: {
      tags: ["External API"],
      summary: "Read one clean vehicle detail without private inventory fields",
      operationId: "getExternalApiVehicle",
      security: [{ externalApiKey: ["inventory.read"] }],
      responses: { "200": { description: "Vehicle detail." } },
    },
  },
} as const;
