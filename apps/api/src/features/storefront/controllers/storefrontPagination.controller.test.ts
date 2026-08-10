import { describe, expect, it } from "vitest";
import { createStorefrontFeature } from "./storefront.controller.js";
import { createRepository } from "./storefront.controller.testSupport.js";

describe("public storefront listings pagination", () => {
  it("passes a valid offset without changing store scope", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/listings?limit=48&offset=96", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(repository.listPublicListings).toHaveBeenCalledWith({
      limit: 48,
      offset: 96,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it.each(["limit=49", "offset=-1", "offset=1.5"])(
    "rejects invalid pagination: %s",
    async (query) => {
      const repository = createRepository();
      const app = createStorefrontFeature({ repository });

      const response = await app.request(`/listings?${query}`, {
        headers: { host: "demo.lojaveiculos.com.br" },
      });

      expect(response.status).toBe(400);
      expect(repository.listPublicListings).not.toHaveBeenCalled();
    },
  );
});
