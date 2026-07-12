import {
  externalApiAssignableScopes,
  externalApiBasePath,
  externalApiRuntimeOperations,
} from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { scopeOptions } from "./publicApiCatalog";
import {
  createCurlExample,
  publicApiEndpoints,
} from "./publicApiRuntimeCatalog";
import { resolvePublicApiDeploymentBaseUrl } from "./runtimeApi";

describe("Public API generated artifacts", () => {
  it("keeps the UI endpoint catalog aligned with the runtime contract", () => {
    expect(
      publicApiEndpoints.map((endpoint) => ({
        method: endpoint.method,
        operationId: endpoint.operationId,
        path: `${externalApiBasePath}${endpoint.path}`,
        scope: endpoint.scopes[0],
      })),
    ).toEqual(
      externalApiRuntimeOperations.map((operation) => ({
        method: operation.method,
        operationId: operation.operationId,
        path: operation.path,
        scope: operation.scope,
      })),
    );
  });

  it("keeps every assignable API-key scope visible in the UI catalog", () => {
    expect(scopeOptions.map((option) => option.scope).sort()).toEqual(
      [...externalApiAssignableScopes].sort(),
    );
  });

  it("builds executable curl examples against the configured API deployment", () => {
    const createLead = publicApiEndpoints.find(
      (endpoint) => endpoint.operationId === "createExternalApiLead",
    );
    if (!createLead) throw new Error("Missing create lead endpoint");

    const curl = createCurlExample(createLead, "https://api.staging.local");
    expect(curl).toContain(
      '"https://api.staging.local/api/v1/external-api/leads"',
    );
    expect(curl).toContain("Idempotency-Key: lead-import-001");
    expect(curl).not.toContain("\n+");
    expect(curl).not.toContain("app.lojaveiculos.com.br");
  });

  it("derives the API deployment base from relative and absolute API URLs", () => {
    expect(
      resolvePublicApiDeploymentBaseUrl("/api/v1", "https://app.staging.local"),
    ).toBe("https://app.staging.local");
    expect(
      resolvePublicApiDeploymentBaseUrl(
        "https://api.staging.local/api/v1",
        "https://app.staging.local",
      ),
    ).toBe("https://api.staging.local");
  });
});
