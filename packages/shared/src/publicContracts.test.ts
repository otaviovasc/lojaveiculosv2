import { describe, expect, it } from "vitest";
import {
  externalApiAssignableScopes,
  externalApiBasePath,
  externalApiRuntimeOperations,
  externalApiRuntimeScopes,
} from "./externalApiContract.js";
import {
  normalizeStorefrontPageSlug,
  storefrontBuilderComponentTypes,
} from "./storefrontBuilder.js";

describe("external API contract", () => {
  it("keeps runtime operations unique and scoped to assignable permissions", () => {
    const operationIds = externalApiRuntimeOperations.map(
      ({ operationId }) => operationId,
    );
    const methodPaths = externalApiRuntimeOperations.map(
      ({ method, path }) => `${method} ${path}`,
    );

    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(new Set(methodPaths).size).toBe(methodPaths.length);
    for (const operation of externalApiRuntimeOperations) {
      expect(operation.path.startsWith(`${externalApiBasePath}/`)).toBe(true);
      expect(externalApiAssignableScopes).toContain(operation.scope);
    }
  });

  it("documents every scope exposed by a runtime operation", () => {
    const documentedScopes = new Set(
      externalApiRuntimeScopes.map(({ key }) => key),
    );

    for (const operation of externalApiRuntimeOperations) {
      expect(documentedScopes.has(operation.scope)).toBe(true);
    }
  });
});

describe("storefront builder contract", () => {
  it.each([
    [" Página de Ofertas ", "pagina-de-ofertas"],
    ["SUVs & 4x4", "suvs-4x4"],
    ["---", ""],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeStorefrontPageSlug(input)).toBe(expected);
  });

  it("keeps component type identifiers unique", () => {
    expect(new Set(storefrontBuilderComponentTypes).size).toBe(
      storefrontBuilderComponentTypes.length,
    );
  });
});
