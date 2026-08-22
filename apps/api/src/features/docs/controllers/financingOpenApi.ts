import { z } from "zod";
import {
  createSimulationSchema,
  requiredFieldsSchema,
} from "../../financing/controllers/credereFinancing.schemas.js";
import { financingConnectionPaths } from "./financingConnectionOpenApi.js";
import { credereRequiredFieldsResponseSchema } from "./financingRequiredFieldsOpenApi.js";

const bearerSecurity = [{ bearerAuth: [] }];

export const financingSchemas = {
  CredereStoreStatus: {
    type: "object",
    additionalProperties: false,
    required: [
      "configured",
      "mappedStoreAlias",
      "unavailableBanks",
      "usableBanks",
    ],
    properties: {
      configured: { type: "boolean" },
      mappedStoreAlias: { type: ["string", "null"] },
      unavailableBanks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "reason"],
          properties: {
            code: { type: "string" },
            name: { type: "string" },
            reason: {
              type: "string",
              enum: ["authorization_required", "inactive", "provider_error"],
            },
          },
        },
      },
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
    ...toOpenApiInputSchema(requiredFieldsSchema),
  },
  CredereRequiredFieldsResponse: credereRequiredFieldsResponseSchema,
  CredereSimulationRequest: {
    ...toOpenApiInputSchema(createSimulationSchema),
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
      responses: response(
        "Required field result.",
        "200",
        "CredereRequiredFieldsResponse",
      ),
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
      parameters: [
        {
          in: "header",
          name: "Idempotency-Key",
          required: true,
          description:
            "Stable key for retrying the same simulation request without creating a duplicate.",
          schema: { type: "string", minLength: 1, maxLength: 191 },
        },
      ],
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

function toOpenApiInputSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  });
  return jsonSchema;
}

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
