import { describe, expect, it, vi } from "vitest";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import { createStorefrontFeature } from "./storefront.controller.js";

describe("public storefront routes", () => {
  it("lists public vehicles for the store resolved from host", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/listings?limit=1", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      listings: [listing],
      store,
    });
    expect(repository.findPublicStoreBySlug).toHaveBeenCalledWith("demo");
    expect(repository.listPublicListings).toHaveBeenCalledWith({
      limit: 1,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("rejects requests without a store subdomain", async () => {
    const app = createStorefrontFeature({ repository: createRepository() });
    const response = await app.request("/listings", {
      headers: { host: "lojaveiculos.com.br" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Store subdomain is required.",
    });
  });

  it("gets public vehicle detail for the store resolved from host", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/listings/fiat-toro-2023", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      listing,
      store,
    });
    expect(repository.findPublicListingDetail).toHaveBeenCalledWith({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("maps unknown public listings to not found", async () => {
    const app = createStorefrontFeature({
      repository: createRepository({ includeListing: false }),
    });
    const response = await app.request("/listings/missing", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "Public storefront listing not found: missing",
    });
  });

  it("maps unknown public stores to not found", async () => {
    const app = createStorefrontFeature({
      repository: createRepository({ includeStore: false }),
    });
    const response = await app.request("/listings", {
      headers: { host: "missing.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "Public storefront not found: missing",
    });
  });
});

const store = {
  id: "store_1" as never,
  name: "Loja Demo",
  slug: "demo",
  tenantId: "tenant_1" as never,
};

const listing = {
  description: "Ready to sell.",
  listingId: "listing_1",
  manufactureYear: 2022,
  media: [
    {
      altText: "Front photo",
      displayOrder: 0,
      kind: "photo" as const,
      mediaId: "media_1",
      url: "https://cdn.local/front.jpg",
    },
  ],
  mileageKm: 32000,
  modelYear: 2023,
  priceCents: 12690000,
  slug: "fiat-toro-2023",
  status: "available" as const,
  thumbnailUrl: null,
  title: "Fiat Toro Volcano 2023",
};

function createRepository(
  options: { includeListing?: boolean; includeStore?: boolean } = {},
): PublicStorefrontRepository {
  return {
    findPublicListingDetail: vi.fn(async () =>
      options.includeListing === false ? null : listing,
    ),
    findPublicStoreBySlug: vi.fn(async () =>
      options.includeStore === false ? null : store,
    ),
    listPublicListings: vi.fn(async () => [listing]),
  };
}
