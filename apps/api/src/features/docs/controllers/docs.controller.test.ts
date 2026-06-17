import { describe, expect, it } from "vitest";
import { createApp } from "../../../infrastructure/http/createApp.js";
import { llmsText, openApiDocument } from "./docs.controller.js";

describe("API docs routes", () => {
  it("serves deterministic llms.txt metadata", async () => {
    const app = createApp();

    const response = await app.request("/llms.txt");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(llmsText);
  });

  it("serves deterministic OpenAPI metadata", async () => {
    const app = createApp();

    const response = await app.request("/api/v1/openapi.json");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(openApiDocument);
  });

  it("documents current inventory auth and planned external API limits", () => {
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}"].get
        .security,
    ).toEqual([{ bearerAuth: ["inventory.read"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/price"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_price"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/status"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_status"] }]);
    expect(openApiDocument.components.schemas.ListingScaffold).toEqual(
      expect.objectContaining({
        required: ["listingId", "status"],
      }),
    );
    expect(openApiDocument["x-scopes"]["inventory.read"]).toContain(
      "Read vehicle inventory",
    );
    expect(openApiDocument["x-planned-external-api-safety-limits"]).toContain(
      "Tenant and store scoping required for every external request.",
    );
  });
});
