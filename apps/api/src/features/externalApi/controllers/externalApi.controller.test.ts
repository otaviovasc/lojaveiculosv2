import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createExternalApiFeature } from "./externalApi.controller.js";
import { createExternalApiServices } from "./externalApiServices.js";

describe("external API credential management", () => {
  it("marks the one-time secret response as non-cacheable", async () => {
    const app = createExternalApiFeature({
      contextFactory: async () => managementContext(),
      services: createExternalApiServices(),
    });

    const response = await app.request("/clients", {
      body: JSON.stringify({
        name: "Catálogo externo",
        scopes: ["inventory.read"],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const json = (await response.json()) as { apiKey: unknown };
    expect(json.apiKey).toEqual(expect.stringMatching(/^lv2_/));
  });
});

function managementContext() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["external_api.manage"],
      request: { requestId: "request_create_client" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["external_api"] as const },
  );
}
