import { describe, expect, it, vi } from "vitest";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX Autoupload submission evidence", () => {
  it.each([
    [-1, "MARKETPLACE_PROVIDER_UNAVAILABLE"],
    [-2, "MARKETPLACE_PROVIDER_RATE_LIMITED"],
    [-3, "MARKETPLACE_PROVIDER_VALIDATION_FAILED"],
    [-4, "MARKETPLACE_PROVIDER_VALIDATION_FAILED"],
    [-5, "MARKETPLACE_PROVIDER_UNAVAILABLE"],
    [-6, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-7, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-8, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-99, "MARKETPLACE_PROVIDER_UNAVAILABLE"],
  ] as const)("maps statusCode %s to %s", async (statusCode, code) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ statusCode }));

    await expect(publish(fetch)).rejects.toMatchObject({
      code,
      details: { provider: "olx", providerStatus: String(statusCode) },
    });
  });

  it("fails closed on partial-limit status even when OLX returns a token", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        errors: [{ id: "another_ad", messages: [{ limit: "ignored" }] }],
        statusCode: -8,
        token: "import_token_8",
      }),
    );

    await expect(publish(fetch)).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
      details: { providerStatus: "-8" },
    });
  });

  it("rejects untrackable accepted submissions without an import token", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ statusCode: 0, token: null }));

    await expect(publish(fetch)).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      status: 503,
    });
  });

  it("maps per-ad delete not-found errors to listing not found", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        errors: [
          {
            id: "listing_1",
            messages: [{ id: "not found" }],
            status: "error",
          },
        ],
        statusCode: -4,
      }),
    );

    await expect(
      createOlxTestGateway(fetch).runListingSync({
        externalId: "listing_1",
        jobType: "listing_unpublish",
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_LISTING_NOT_FOUND",
      details: { externalId: "listing_1", provider: "olx" },
    });
  });
});

function publish(fetch: typeof globalThis.fetch) {
  return createOlxTestGateway(fetch).runListingSync({
    jobType: "listing_publish",
    listing: listingProjection(),
    metadata: {},
    token: tokenSet(),
  });
}
