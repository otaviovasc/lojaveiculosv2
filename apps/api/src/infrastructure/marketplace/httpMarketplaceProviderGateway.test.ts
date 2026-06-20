import { describe, expect, it, vi } from "vitest";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";

describe("createHttpMarketplaceProviderGateway", () => {
  it("creates OAuth URLs and publishes listing payloads", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response(JSON.stringify({ id: "MLB123", status: "active" }), {
          status: 200,
        }),
    );
    const gateway = createHttpMarketplaceProviderGateway({
      auth: { clientId: "client_1" },
      authorizationUrl: "https://auth.example.test/authorization",
      baseUrl: "https://api.example.test",
      fetch,
      provider: "mercado_livre",
      tokenUrl: "https://api.example.test/oauth/token",
    });

    const url = await gateway.createAuthorizationUrl({
      redirectUri: "https://app.example.test/callback",
      state: "state_1",
    });
    const result = await gateway.runListingSync({
      jobType: "listing_publish",
      listing: {
        description: "Descricao",
        listingId: "listing_1",
        mediaUrls: ["https://cdn.example.test/photo.jpg"],
        modelYear: 2024,
        priceCents: 12000000,
        title: "Honda Civic",
        vehicleType: "cars",
      },
      metadata: { categoryId: "MLB1744" },
      token: {
        accessToken: "token_1",
        expiresAt: null,
        providerAccountId: null,
        refreshToken: null,
        scope: null,
        tokenType: "Bearer",
      },
    });

    expect(url).toContain("client_id=client_1");
    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.example.test/items");
    expect(result.externalId).toBe("MLB123");
  });
});
