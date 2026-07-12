import {
  errorResponse,
  externalRuntimeSecurity,
  idempotencyKeyParameter,
  jsonResponse,
  leadIdParameter,
  leadQueryParameters,
  listingIdParameter,
  managementSecurity,
  protectedErrorResponses,
  requestBody,
  vehicleQueryParameters,
} from "./externalApiOpenApiSupport.js";

export const externalApiPaths = {
  "/api/v1/external-api/ai-tools": {
    get: {
      tags: ["External API"],
      summary: "Return AI tool definitions for Public API builders",
      operationId: "getExternalApiAiTools",
      responses: {
        "200": jsonResponse("Public API tool metadata.", "ExternalApiTools"),
      },
    },
  },
  "/api/v1/external-api/clients": {
    get: {
      tags: ["External API"],
      summary: "List scoped API clients",
      operationId: "listExternalApiClients",
      security: managementSecurity,
      "x-required-permissions": ["external_api.manage"],
      responses: {
        "200": jsonResponse(
          "API clients for the current store.",
          "ExternalApiClientListResponse",
        ),
        ...managementErrors(),
      },
    },
    post: {
      tags: ["External API"],
      summary: "Create a scoped API client and one-time key",
      operationId: "createExternalApiClient",
      security: managementSecurity,
      "x-required-permissions": ["external_api.manage"],
      requestBody: requestBody("CreateExternalApiClientRequest"),
      responses: {
        "201": jsonResponse(
          "Created client and one-time plaintext API key.",
          "CreatedExternalApiClient",
        ),
        ...managementErrors(),
      },
    },
  },
  "/api/v1/external-api/clients/{clientId}/revoke": {
    post: {
      tags: ["External API"],
      summary: "Revoke one API client and its active keys",
      operationId: "revokeExternalApiClient",
      security: managementSecurity,
      "x-required-permissions": ["external_api.manage"],
      parameters: [
        {
          in: "path",
          name: "clientId",
          required: true,
          schema: { type: "string", minLength: 1 },
        },
      ],
      responses: {
        "200": jsonResponse("Revoked client.", "ExternalApiClient"),
        "404": errorResponse("API client not found."),
        ...managementErrors(),
      },
    },
  },
  "/api/v1/external-api/leads": {
    get: runtimeOperation(
      "List CRM leads through a scoped external API key",
      "listExternalApiLeads",
      "lead.read",
      leadQueryParameters,
      "ExternalApiLeadListResponse",
    ),
    post: {
      ...runtimeOperationBase(
        "Create a CRM lead from an external app or AI agent",
        "createExternalApiLead",
        "lead.create",
      ),
      parameters: [idempotencyKeyParameter],
      requestBody: requestBody("CreateExternalApiLeadRequest"),
      "x-deduplication-semantics": "reject-duplicate-key-with-409",
      responses: {
        "201": jsonResponse(
          "Created lead envelope.",
          "ExternalApiLeadResponse",
        ),
        "409": errorResponse("Deduplication key was already used."),
        ...protectedErrorResponses,
      },
    },
  },
  "/api/v1/external-api/leads/{leadId}": {
    get: {
      ...runtimeOperationBase(
        "Read one CRM lead through a scoped external API key",
        "getExternalApiLead",
        "lead.read",
      ),
      parameters: [leadIdParameter],
      responses: detailResponses(
        "Lead detail envelope.",
        "ExternalApiLeadResponse",
      ),
    },
    patch: {
      ...runtimeOperationBase(
        "Update lead status or buyer contact fields",
        "updateExternalApiLead",
        "lead.update",
      ),
      parameters: [leadIdParameter, idempotencyKeyParameter],
      requestBody: requestBody("UpdateExternalApiLeadRequest"),
      "x-deduplication-semantics": "reject-duplicate-key-with-409",
      responses: {
        "200": jsonResponse(
          "Updated lead envelope.",
          "ExternalApiLeadResponse",
        ),
        "404": errorResponse("Lead not found."),
        "409": errorResponse("Deduplication key was already used."),
        ...protectedErrorResponses,
      },
    },
  },
  "/api/v1/external-api/manifest": {
    get: {
      tags: ["External API"],
      summary: "Return the Public API capability manifest",
      operationId: "getExternalApiManifest",
      responses: {
        "200": jsonResponse("Capability manifest.", "ExternalApiManifest"),
      },
    },
  },
  "/api/v1/external-api/vehicles": {
    get: runtimeOperation(
      "List vehicles using a clean external DTO",
      "listExternalApiVehicles",
      "inventory.read",
      vehicleQueryParameters,
      "ExternalApiVehicleListResponse",
    ),
  },
  "/api/v1/external-api/vehicles/search": {
    get: runtimeOperation(
      "Search vehicles with V1-compatible aliases and V2 filters",
      "searchExternalApiVehicles",
      "inventory.read",
      vehicleQueryParameters,
      "ExternalApiVehicleListResponse",
    ),
  },
  "/api/v1/external-api/vehicles/{listingId}": {
    get: {
      ...runtimeOperationBase(
        "Read one clean vehicle detail without private inventory fields",
        "getExternalApiVehicle",
        "inventory.read",
      ),
      parameters: [listingIdParameter],
      responses: detailResponses(
        "Vehicle detail envelope.",
        "ExternalApiVehicleResponse",
      ),
    },
  },
} as const;

function runtimeOperation(
  summary: string,
  operationId: string,
  scope: string,
  parameters: readonly unknown[],
  schemaName: string,
) {
  return {
    ...runtimeOperationBase(summary, operationId, scope),
    parameters,
    responses: {
      "200": jsonResponse("Paginated result envelope.", schemaName),
      ...protectedErrorResponses,
    },
  } as const;
}

function runtimeOperationBase(
  summary: string,
  operationId: string,
  scope: string,
) {
  return {
    tags: ["External API"],
    summary,
    operationId,
    security: externalRuntimeSecurity,
    "x-required-scopes": [scope],
  } as const;
}

function detailResponses(description: string, schemaName: string) {
  return {
    "200": jsonResponse(description, schemaName),
    "404": errorResponse("Resource not found."),
    ...protectedErrorResponses,
  } as const;
}

function managementErrors() {
  return {
    "400": errorResponse("Invalid management request."),
    "401": errorResponse("User authentication required."),
    "403": errorResponse("Missing external_api.manage permission."),
    "500": errorResponse("Unexpected server error."),
  } as const;
}
