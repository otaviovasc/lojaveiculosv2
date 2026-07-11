import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@lojaveiculosv2/audit";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { getPublicVehicleListing } from "./getPublicVehicleListing.js";
import { PublicStorefrontListingNotFoundError } from "./serviceSupport.js";

describe("getPublicVehicleListing", () => {
  it("resolves store, listing detail, media, and audits read", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createRepository();

    const result = await getPublicVehicleListing(
      createPublicContext(audit),
      { listingSlug: "fiat-toro-2023", storeSlug: "demo" },
      repository,
    );

    expect(result.listing.media).toHaveLength(1);
    expect(repository.findPublicListingDetail).toHaveBeenCalledWith({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.listing.get",
        entityId: "fiat-toro-2023",
      }),
    );
    const [[auditEvent]] = audit.record.mock.calls as unknown as [[AuditEvent]];
    expect(auditEvent.metadata).toEqual(
      expect.objectContaining({ mediaCount: 1 }),
    );
  });

  it("throws when listing is not public", async () => {
    await expect(
      getPublicVehicleListing(
        createPublicContext(),
        { listingSlug: "missing", storeSlug: "demo" },
        createRepository({ includeListing: false }),
      ),
    ).rejects.toBeInstanceOf(PublicStorefrontListingNotFoundError);
  });

  it("requires public storefront permission", async () => {
    const context = createPublicContext();
    context.permissions = ["public"];

    await expect(
      getPublicVehicleListing(
        context,
        { listingSlug: "fiat-toro-2023", storeSlug: "demo" },
        createRepository(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

function createPublicContext(audit = { record: vi.fn(async () => undefined) }) {
  return {
    actor: { id: "public", kind: "public" as const },
    audit,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    permissions: ["public", "public_storefront.read"],
    requestId: "req_1",
    storeId: null,
    tenantId: null,
  };
}

function createRepository(options: { includeListing?: boolean } = {}) {
  return {
    findPublicListingDetail: vi.fn(async () =>
      options.includeListing === false ? null : listing,
    ),
    findPublicSiteBySlug: vi.fn(async () => null),
    findPublicStoreBySlug: vi.fn(async () => store),
    listPublicListings: vi.fn(async () => [listing]),
  };
}

const store = {
  id: "store_1" as never,
  name: "Loja Demo",
  slug: "demo",
  tenantId: "tenant_1" as never,
};

const listingHeroMedia = {
  altText: "Front photo",
  displayOrder: 0,
  kind: "photo" as const,
  unitColorName: "Preto",
  unitId: "unit_1",
  url: "https://cdn.local/front.jpg",
};

const listing = {
  condition: "used" as const,
  description: "Ready to sell.",
  doors: 4,
  engineAspiration: "turbo" as const,
  engineDisplacement: "2.0" as const,
  fuelType: "flex",
  heroMedia: listingHeroMedia,
  id: "listing_1",
  manufactureYear: 2022,
  media: [listingHeroMedia],
  mediaGroups: [
    {
      colorName: "Preto",
      media: [listingHeroMedia],
      unitId: "unit_1",
    },
  ],
  mileageKm: 32000,
  modelYear: 2023,
  priceCents: 12690000,
  slug: "fiat-toro-2023",
  status: "available" as const,
  thumbnailUrl: "https://cdn.local/front.jpg",
  title: "Fiat Toro Volcano 2023",
  transmission: "automatic",
  trimName: "Volcano",
};
