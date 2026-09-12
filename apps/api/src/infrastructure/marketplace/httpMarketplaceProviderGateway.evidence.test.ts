import { describe, expect, it, vi } from "vitest";
import type { MarketplaceProviderGateway } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

type Operation = "publish" | "unpublish" | "update";
const operations: Operation[] = ["publish", "update", "unpublish"];

describe("generic marketplace provider operation evidence", () => {
  it.each(operations)("rejects an empty 2xx %s response", async (operation) => {
    const gateway = testGateway(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 200 })),
    );

    await expect(run(gateway, operation)).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "mercado_livre" },
    });
  });

  it.each(operations)(
    "rejects a malformed 2xx %s response",
    async (operation) => {
      const gateway = testGateway(
        vi.fn<typeof fetch>().mockResolvedValue(
          new Response("not-json", {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        ),
      );

      await expect(run(gateway, operation)).rejects.toMatchObject({
        code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
        details: { provider: "mercado_livre" },
      });
    },
  );

  it.each(operations)(
    "rejects explicit provider rejection for %s",
    async (operation) => {
      const gateway = testGateway(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            jsonResponse({ id: "MLB123", status: "rejected", token: "secret" }),
          ),
      );

      await expect(run(gateway, operation)).rejects.toMatchObject({
        code: "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
        details: {
          provider: "mercado_livre",
          providerStatus: "rejected",
        },
      });
    },
  );

  it("accepts publish evidence with an external id and status", async () => {
    const gateway = testGateway(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ id: "MLB123", status: "active" })),
    );

    await expect(run(gateway, "publish")).resolves.toMatchObject({
      externalId: "MLB123",
      providerStatus: "active",
    });
  });

  it("accepts matching update evidence", async () => {
    const gateway = testGateway(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ id: "MLB123", status: "active" })),
    );

    await expect(run(gateway, "update")).resolves.toMatchObject({
      externalId: "MLB123",
      providerStatus: "active",
    });
  });

  it("rejects update evidence for another listing", async () => {
    const gateway = testGateway(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ id: "MLB999", status: "active" })),
    );

    await expect(run(gateway, "update")).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "mercado_livre" },
    });
  });

  it("accepts 204 as explicit unpublish evidence", async () => {
    const gateway = testGateway(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(run(gateway, "unpublish")).resolves.toMatchObject({
      externalId: "MLB123",
      providerStatus: "unpublished",
    });
  });
});

function testGateway(fetch: typeof globalThis.fetch) {
  return createHttpMarketplaceProviderGateway({
    auth: { clientId: "client_1" },
    authorizationUrl: "https://auth.example.test/authorization",
    baseUrl: "https://api.example.test",
    fetch,
    provider: "mercado_livre",
    tokenUrl: "https://api.example.test/oauth/token",
  });
}

function run(gateway: MarketplaceProviderGateway, operation: Operation) {
  if (operation === "publish") {
    return gateway.runListingSync({
      jobType: "listing_publish",
      listing: listingProjection(),
      metadata: {},
      token: tokenSet(),
    });
  }
  return gateway.runListingSync({
    externalId: "MLB123",
    jobType: operation === "update" ? "listing_update" : "listing_unpublish",
    ...(operation === "update" ? { listing: listingProjection() } : {}),
    metadata: {},
    token: tokenSet(),
  });
}
