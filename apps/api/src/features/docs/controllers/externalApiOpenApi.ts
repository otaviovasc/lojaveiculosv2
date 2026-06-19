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
} as const;

export const externalApiPaths = {
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
} as const;
