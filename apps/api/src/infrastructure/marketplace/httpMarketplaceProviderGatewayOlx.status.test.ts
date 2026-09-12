import { describe, expect, it, vi } from "vitest";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";

describe("OLX Autoupload response status", () => {
  it.each([{}, { statusCode: 1 }])(
    "rejects a non-success statusCode response: %j",
    async (responsePayload) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(jsonResponse(responsePayload));

      await expect(
        createOlxTestGateway(fetch).runListingSync({
          jobType: "listing_publish",
          listing: listingProjection(),
          metadata: {},
          token: tokenSet(),
        }),
      ).rejects.toMatchObject({
        code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
        details: { provider: "olx" },
      });
    },
  );

  it.each([
    new Response(null, { status: 200 }),
    new Response("{malformed", {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  ])(
    "rejects 2xx responses without valid acceptance evidence",
    async (response) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(response);

      await expect(
        createOlxTestGateway(fetch).runListingSync({
          jobType: "listing_publish",
          listing: listingProjection(),
          metadata: {},
          token: tokenSet(),
        }),
      ).rejects.toMatchObject({
        code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
        details: { provider: "olx" },
      });
    },
  );
});
