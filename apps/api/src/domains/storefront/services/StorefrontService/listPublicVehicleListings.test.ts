import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import { listPublicVehicleListings } from "./listPublicVehicleListings.js";
import { PublicStorefrontNotFoundError } from "./serviceSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("listPublicVehicleListings", () => {
  it("resolves store slug, lists public inventory, and audits read", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createRepository();
    const result = await listPublicVehicleListings(
      createPublicContext(audit),
      { limit: 12, storeSlug: "demo" },
      repository,
    );

    expect(result.store.slug).toBe("demo");
    expect(result.listings).toHaveLength(1);
    expect(repository.listPublicListings).toHaveBeenCalledWith({
      limit: 12,
      storeId,
      tenantId,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.listings.list",
        storeId: "store_1",
      }),
    );
  });

  it("fails closed without public storefront read permission", async () => {
    await expect(
      listPublicVehicleListings(
        createServiceContext({
          permissions: [],
          request: { requestId: "req_1" },
        }),
        { limit: 12, storeSlug: "demo" },
        createRepository(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns a typed not found error for unknown store slugs", async () => {
    await expect(
      listPublicVehicleListings(
        createPublicContext(),
        { limit: 12, storeSlug: "missing" },
        createRepository({ includeStore: false }),
      ),
    ).rejects.toBeInstanceOf(PublicStorefrontNotFoundError);
  });
});

function createPublicContext(audit = { record: vi.fn(async () => undefined) }) {
  return createServiceContext({
    audit,
    permissions: ["public_storefront.read"],
    request: { requestId: "req_1" },
  });
}

function createRepository(
  options: { includeStore?: boolean } = {},
): PublicStorefrontRepository {
  const heroMedia = {
    altText: "Front photo",
    displayOrder: 0,
    kind: "photo" as const,
    unitColorName: "Preto",
    unitId: "unit_1",
    url: "https://cdn.local/front.jpg",
  };

  return {
    findPublicListingDetail: vi.fn(async () => null),
    findPublicSiteBySlug: vi.fn(async () => null),
    findPublicStoreBySlug: vi.fn(async (storeSlug: string) =>
      options.includeStore === false
        ? null
        : {
            id: storeId,
            name: "Loja Demo",
            slug: storeSlug,
            tenantId,
          },
    ),
    listPublicListings: vi.fn(async () => [
      {
        commercialTags: [],
        condition: "used" as const,
        description: "Ready to sell.",
        doors: 4,
        engineAspiration: "turbo" as const,
        engineDisplacement: "2.0" as const,
        fuelType: "flex",
        heroMedia,
        id: "listing_1",
        manufactureYear: 2022,
        mileageKm: 32000,
        modelYear: 2023,
        priceCents: 12690000,
        slug: "fiat-toro-2023",
        status: "available" as const,
        thumbnailUrl: "https://cdn.local/front.jpg",
        title: "Fiat Toro Volcano 2023",
        transmission: "automatic",
        trimName: "Volcano",
        videoUrl: null,
      },
    ]),
  };
}
