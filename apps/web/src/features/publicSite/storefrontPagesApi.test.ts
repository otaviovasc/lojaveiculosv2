import { describe, expect, it, vi } from "vitest";
import { createStorefrontPagesApi } from "./storefrontPagesApi";

describe("storefrontPagesApi vehicle Vitrine command", () => {
  it("sends an authenticated idempotent PUT for the listing", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        page: {
          components: [],
          id: "page_1",
          order: 0,
          slug: "vitrine-sedan-listing-1",
          title: "Sedan",
          visible: true,
        },
      }),
    );
    const api = createStorefrontPagesApi({
      auth: { accessToken: "token", storeSlug: "demo" },
      baseUrl: "/api/v1",
      fetch,
    });

    await expect(
      api.createOrReuseVehicleVitrine("listing/1", { visible: true }),
    ).resolves.toMatchObject({ id: "page_1", visible: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/storefront/pages/vehicle-vitrine/listing%2F1",
      expect.objectContaining({
        body: JSON.stringify({ visible: true }),
        method: "PUT",
      }),
    );
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer token",
      "x-store-slug": "demo",
    });
  });
});
