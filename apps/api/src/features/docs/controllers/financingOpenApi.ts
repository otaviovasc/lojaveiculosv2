import { financingConnectionPaths } from "./financingConnectionOpenApi.js";

const bearerSecurity = [{ bearerAuth: [] }];

export const financingSchemas = {
  CredereStoreStatus: {
    type: "object",
    additionalProperties: false,
    required: ["configured", "mappedStoreAlias", "usableBanks"],
    properties: {
      configured: { type: "boolean" },
      mappedStoreAlias: { type: ["string", "null"] },
      usableBanks: {
        type: "array",
        items: {
          oneOf: [
            { type: "string" },
            {
              type: "object",
              additionalProperties: false,
              required: ["code"],
              properties: {
                code: { type: "string" },
                name: { type: "string" },
              },
            },
          ],
        },
      },
    },
  },
  CredereRequiredFieldsRequest: {
    type: "object",
    additionalProperties: false,
    required: ["document"],
    properties: { document: { type: "string" } },
  },
  CredereSimulationRequest: {
    type: "object",
    additionalProperties: false,
    required: ["applicant", "vehicle", "terms", "consent"],
    properties: {
      applicant: { type: "object", additionalProperties: false },
      consent: { type: "object", additionalProperties: false },
      leadId: { type: "string" },
      listingId: { type: "string" },
      terms: { type: "object", additionalProperties: false },
      unitId: { type: "string" },
      vehicle: { type: "object", additionalProperties: false },
    },
  },
  CredereStoreMappingRequest: {
    type: "object",
    additionalProperties: false,
    required: ["externalStoreId"],
    properties: { externalStoreId: { type: "string" } },
  },
} as const;

export const financingPaths = {
  ...financingConnectionPaths,
  "/api/v1/financing/credere/status": {
    get: {
      tags: ["Financing"],
      summary: "Read current store Credere financing status.",
      operationId: "getCredereStoreStatus",
      security: bearerSecurity,
      responses: response("Store status.", "200", "CredereStoreStatus"),
    },
  },
  "/api/v1/financing/credere/required-fields": {
    post: {
      tags: ["Financing"],
      summary: "Read required financing fields for an applicant document.",
      operationId: "getCredereRequiredFields",
      security: bearerSecurity,
      requestBody: jsonBody("CredereRequiredFieldsRequest"),
      responses: response("Required field result."),
    },
  },
  "/api/v1/financing/credere/simulations": {
    get: {
      tags: ["Financing"],
      summary: "List current store financing simulations.",
      operationId: "listCredereSimulations",
      security: bearerSecurity,
      responses: response("Simulation list."),
    },
    post: {
      tags: ["Financing"],
      summary: "Create a Credere financing simulation.",
      operationId: "createCredereSimulation",
      security: bearerSecurity,
      parameters: [{ in: "header", name: "Idempotency-Key", required: true }],
      requestBody: jsonBody("CredereSimulationRequest"),
      responses: {
        ...response("Created simulation.", "201"),
        "202": { description: "Simulation accepted for processing." },
      },
    },
  },
  "/api/v1/financing/credere/simulations/{inquiryId}": {
    get: {
      tags: ["Financing"],
      summary: "Read a current store financing simulation.",
      operationId: "getCredereSimulation",
      security: bearerSecurity,
      responses: response("Simulation detail."),
    },
  },
  "/api/v1/financing/credere/simulations/{inquiryId}/refresh": {
    post: {
      tags: ["Financing"],
      summary: "Refresh a current store financing simulation.",
      operationId: "refreshCredereSimulation",
      security: bearerSecurity,
      responses: response("Refresh accepted.", "202"),
    },
  },
} as const;

function jsonBody(schemaName: keyof typeof financingSchemas) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function response(
  description: string,
  status = "200",
  schemaName?: keyof typeof financingSchemas,
) {
  return {
    [status]: {
      description,
      ...(schemaName
        ? {
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${schemaName}` },
              },
            },
          }
        : {}),
    },
    "400": { description: "Invalid request." },
    "401": { description: "Authentication required." },
    "403": { description: "Authorization or entitlement denied." },
    "409": { description: "Conflict or duplicate idempotency key." },
    "422": { description: "Provider/domain validation failed." },
    "429": { description: "Provider rate limited the request." },
    "503": { description: "Credere financing unavailable." },
  };
}
