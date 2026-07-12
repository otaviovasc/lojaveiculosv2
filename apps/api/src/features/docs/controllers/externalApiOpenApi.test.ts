import SwaggerParser from "@apidevtools/swagger-parser";
import {
  externalApiAssignableScopes,
  externalApiContractVersion,
  externalApiRuntimeOperations,
  externalApiRuntimeScopes,
} from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createExternalApiClientSchema } from "../../externalApi/controllers/externalApi.controller.schemas.js";
import { createExternalApiManifest } from "../../externalApi/controllers/externalApiRuntime.manifest.js";
import {
  externalCreateLeadSchema,
  externalLeadQuerySchema,
  externalUpdateLeadSchema,
  externalVehicleQuerySchema,
} from "../../externalApi/controllers/externalApiRuntime.schemas.js";
import { externalApiOpenApiDocument } from "./externalApiDocs.js";

type OpenApiOperation = {
  operationId: string;
  parameters?: readonly { in: string; name: string }[];
  requestBody?: {
    content: { "application/json": { schema: { $ref: string } } };
  };
  responses: Record<
    string,
    { content?: { "application/json"?: { schema: { $ref: string } } } }
  >;
  security?: readonly Record<string, readonly string[]>[];
  "x-required-scopes"?: readonly string[];
  "x-required-permissions"?: readonly string[];
};

describe("Public API OpenAPI contract", () => {
  it("passes OpenAPI 3.1 structural and reference validation", async () => {
    const document = structuredClone(
      externalApiOpenApiDocument,
    ) as unknown as Parameters<typeof SwaggerParser.validate>[0];
    await expect(SwaggerParser.validate(document)).resolves.toBeTruthy();
  });

  it("keeps manifest version, operations, and runtime scopes canonical", () => {
    const manifest = createExternalApiManifest("https://api.local");

    expect(externalApiOpenApiDocument.info.version).toBe(
      externalApiContractVersion,
    );
    expect(manifest.version).toBe(externalApiContractVersion);
    expect(manifest.operations).toEqual(externalApiRuntimeOperations);
    expect(manifest.scopes).toEqual(externalApiRuntimeScopes);
  });

  it("declares every runtime operation with valid auth and required scope", () => {
    for (const contract of externalApiRuntimeOperations) {
      const operation = operationAt(contract.path, contract.method);
      expect(operation.operationId).toBe(contract.operationId);
      expect(operation.security).toEqual([
        { externalApiKey: [] },
        { externalApiBearer: [] },
      ]);
      expect(operation["x-required-scopes"]).toEqual([contract.scope]);

      for (const pathName of pathParameterNames(contract.path)) {
        expect(parameterNames(operation, "path")).toContain(pathName);
      }
    }
  });

  it("separates user permissions from API-key scopes", () => {
    for (const [path, method] of [
      ["/api/v1/external-api/clients", "GET"],
      ["/api/v1/external-api/clients", "POST"],
      ["/api/v1/external-api/clients/{clientId}/revoke", "POST"],
    ] as const) {
      const operation = operationAt(path, method);
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
      expect(operation["x-required-permissions"]).toEqual([
        "external_api.manage",
      ]);
      expect(operation["x-required-scopes"]).toBeUndefined();
    }
  });

  it("keeps query and body artifacts aligned with runtime Zod schemas", () => {
    expect(queryNames("/api/v1/external-api/vehicles", "GET")).toEqual(
      Object.keys(externalVehicleQuerySchema.shape).sort(),
    );
    expect(queryNames("/api/v1/external-api/vehicles/search", "GET")).toEqual(
      Object.keys(externalVehicleQuerySchema.shape).sort(),
    );
    expect(queryNames("/api/v1/external-api/leads", "GET")).toEqual(
      Object.keys(externalLeadQuerySchema.shape).sort(),
    );
    expect(schemaProperties("CreateExternalApiLeadRequest")).toEqual(
      Object.keys(externalCreateLeadSchema.shape).sort(),
    );
    expect(schemaProperties("UpdateExternalApiLeadRequest")).toEqual(
      Object.keys(externalUpdateLeadSchema.shape).sort(),
    );
    expect(schemaProperties("CreateExternalApiClientRequest")).toEqual(
      Object.keys(createExternalApiClientSchema.shape).sort(),
    );
    expect(
      externalApiOpenApiDocument.components.schemas
        .CreateExternalApiClientRequest.properties.scopes.items.enum,
    ).toEqual(externalApiAssignableScopes);
  });

  it("documents the actual response envelopes and duplicate-key behavior", () => {
    expect(responseRef("/api/v1/external-api/vehicles", "GET", "200")).toBe(
      "#/components/schemas/ExternalApiVehicleListResponse",
    );
    expect(
      responseRef("/api/v1/external-api/vehicles/{listingId}", "GET", "200"),
    ).toBe("#/components/schemas/ExternalApiVehicleResponse");
    expect(responseRef("/api/v1/external-api/leads", "GET", "200")).toBe(
      "#/components/schemas/ExternalApiLeadListResponse",
    );
    expect(responseRef("/api/v1/external-api/leads", "POST", "201")).toBe(
      "#/components/schemas/ExternalApiLeadResponse",
    );
    expect(responseRef("/api/v1/external-api/clients", "GET", "200")).toBe(
      "#/components/schemas/ExternalApiClientListResponse",
    );

    for (const [path, method] of [
      ["/api/v1/external-api/leads", "POST"],
      ["/api/v1/external-api/leads/{leadId}", "PATCH"],
    ] as const) {
      const operation = operationAt(path, method);
      expect(parameterNames(operation, "header")).toContain("Idempotency-Key");
      expect(operation.responses["409"]).toBeDefined();
      expect(JSON.stringify(operation)).toContain("reject-duplicate-key");
    }
  });
});

function operationAt(path: string, method: string) {
  const paths = externalApiOpenApiDocument.paths as unknown as Record<
    string,
    Record<string, OpenApiOperation>
  >;
  const operation = paths[path]?.[method.toLowerCase()];
  if (!operation)
    throw new Error(`Missing OpenAPI operation ${method} ${path}`);
  return operation;
}

function parameterNames(operation: OpenApiOperation, location: string) {
  return (operation.parameters ?? [])
    .filter((parameter) => parameter.in === location)
    .map((parameter) => parameter.name);
}

function queryNames(path: string, method: string) {
  return parameterNames(operationAt(path, method), "query").sort();
}

function pathParameterNames(path: string) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function schemaProperties(schemaName: string) {
  const schemas = externalApiOpenApiDocument.components
    .schemas as unknown as Record<
    string,
    { properties: Record<string, unknown> }
  >;
  return Object.keys(schemas[schemaName]?.properties ?? {}).sort();
}

function responseRef(path: string, method: string, status: string) {
  return operationAt(path, method).responses[status]?.content?.[
    "application/json"
  ]?.schema.$ref;
}
