const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

export const externalApiCommonSchemas = {
  ExternalApiPagination: {
    type: "object",
    additionalProperties: false,
    required: ["hasMore", "limit", "nextOffset", "page", "total"],
    properties: {
      hasMore: { type: "boolean" },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      nextOffset: {
        anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
      },
      page: { type: "integer", minimum: 1 },
      total: { type: "integer", minimum: 0 },
    },
  },
  ExternalApiClient: {
    type: "object",
    additionalProperties: false,
    required: [
      "createdAt",
      "id",
      "keyPrefixes",
      "name",
      "scopes",
      "status",
      "storeId",
      "tenantId",
      "updatedAt",
    ],
    properties: {
      createdAt: { type: "string", format: "date-time" },
      id: { type: "string" },
      keyPrefixes: { type: "array", items: { type: "string" } },
      name: { type: "string" },
      scopes: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["active", "revoked", "suspended"] },
      storeId: { type: "string" },
      tenantId: { type: "string" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  ExternalApiClientListResponse: {
    type: "object",
    additionalProperties: false,
    required: ["clients"],
    properties: {
      clients: {
        type: "array",
        items: { $ref: "#/components/schemas/ExternalApiClient" },
      },
    },
  },
  CreatedExternalApiClient: {
    type: "object",
    additionalProperties: false,
    required: ["apiKey", "client"],
    properties: {
      apiKey: {
        type: "string",
        description: "One-time plaintext key. It cannot be fetched later.",
      },
      client: { $ref: "#/components/schemas/ExternalApiClient" },
    },
  },
  ExternalApiLead: {
    type: "object",
    additionalProperties: false,
    required: [
      "buyer",
      "createdAt",
      "id",
      "lastInteractionAt",
      "listingId",
      "metadata",
      "object",
      "source",
      "status",
      "updatedAt",
      "vehicleTitle",
    ],
    properties: {
      buyer: {
        type: "object",
        additionalProperties: false,
        required: ["email", "name", "phone"],
        properties: {
          email: nullableString,
          name: nullableString,
          phone: nullableString,
        },
      },
      createdAt: { type: "string", format: "date-time" },
      id: { type: "string" },
      lastInteractionAt: {
        anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
      },
      listingId: nullableString,
      metadata: { type: "object", additionalProperties: true },
      object: { type: "string", const: "lead" },
      source: { type: "string" },
      status: { type: "string" },
      updatedAt: { type: "string", format: "date-time" },
      vehicleTitle: nullableString,
    },
  },
  ExternalApiLeadResponse: dataEnvelope("ExternalApiLead"),
  ExternalApiLeadListResponse: listEnvelope("ExternalApiLead"),
  ExternalApiManifest: {
    type: "object",
    additionalProperties: false,
    required: [
      "aiNative",
      "auth",
      "baseUrl",
      "operations",
      "scopes",
      "version",
    ],
    properties: {
      aiNative: { type: "object", additionalProperties: { type: "string" } },
      auth: { type: "object", additionalProperties: true },
      baseUrl: { type: "string", format: "uri" },
      operations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["method", "operationId", "path", "scope", "summary"],
          properties: {
            method: { type: "string", enum: ["GET", "PATCH", "POST"] },
            operationId: { type: "string" },
            path: { type: "string" },
            scope: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
      scopes: { type: "array", items: { type: "object" } },
      version: { type: "string" },
    },
  },
  ExternalApiTools: {
    type: "object",
    additionalProperties: false,
    required: ["baseUrl", "tools", "usage"],
    properties: {
      baseUrl: { type: "string", format: "uri" },
      tools: { type: "array", items: { type: "object" } },
      usage: { type: "object", additionalProperties: { type: "string" } },
    },
  },
} as const;

function dataEnvelope(schemaName: string) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: { data: { $ref: `#/components/schemas/${schemaName}` } },
  } as const;
}

function listEnvelope(schemaName: string) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["data", "pagination"],
    properties: {
      data: {
        type: "array",
        items: { $ref: `#/components/schemas/${schemaName}` },
      },
      pagination: { $ref: "#/components/schemas/ExternalApiPagination" },
    },
  } as const;
}
