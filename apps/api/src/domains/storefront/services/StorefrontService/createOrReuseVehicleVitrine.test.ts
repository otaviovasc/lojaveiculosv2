import { describe, expect, it, vi } from "vitest";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { DEFAULT_STOREFRONT_VEHICLE_IMAGE } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { AuthorizationError } from "../../../../shared/authorization.js";
import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import type { PublicVehicleListingDetail } from "../../ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import { createOrReuseVehicleVitrine } from "./createOrReuseVehicleVitrine.js";
import { StorefrontVehicleVitrineSourceNotFoundError } from "./serviceSupport.js";

describe("createOrReuseVehicleVitrine", () => {
  it("builds a public-safe, listing-bound page and honors hidden price", async () => {
    const createOrReuse = vi.fn<
      NonNullable<StorefrontPageRepository["createOrReuseVehicleVitrine"]>
    >(async () => page);
    const publicRepository = createPublicRepository({ priceCents: null });

    const result = await createOrReuseVehicleVitrine(
      context(["inventory.read", "store_public_site.manage"]),
      { listingId: listing.id, visible: true },
      {
        pageRepository: createPageRepository(createOrReuse),
        publicRepository,
      },
    );

    expect(result).toBe(page);
    expect(publicRepository.findPublicListingDetailById).toHaveBeenCalledWith({
      listingId: listing.id,
      storeId: "00000000-0000-4000-8000-000000000002",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });
    const write = createOrReuse.mock.calls[0]?.[1];
    const serialized = JSON.stringify(write?.components);
    expect(write).toMatchObject({ listingId: listing.id, visible: true });
    expect(serialized).toContain("Condição comercial sob consulta");
    expect(serialized).not.toContain("R$");
    expect(serialized).toContain("https://cdn.test/public.jpg");
    expect(serialized).not.toContain("private.jpg");
    expect(serialized).not.toMatch(/plate|vin|internal|used|automatic/i);
    expect(serialized).toContain("Automático");
    expect(serialized).toContain("Seminovo");
    expect(serialized).toContain("4 portas");
    expect(serialized).toContain("#contato");
    expect(serialized).not.toContain("#contact");
    expect(write?.components.map((component) => component.type)).toEqual([
      "marquee",
      "hero",
      "vehicle_specs",
      "gallery",
      "scroll_zoom",
      "contact_section",
      "cta",
    ]);
  });

  it("requires inventory read and storefront management permissions", async () => {
    await expect(
      createOrReuseVehicleVitrine(
        context(["store_public_site.manage"]),
        { listingId: listing.id, visible: true },
        {
          pageRepository: createPageRepository(vi.fn(async () => page)),
          publicRepository: createPublicRepository(),
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("provides a public fallback image when the listing has no photos", async () => {
    const createOrReuse = vi.fn<
      NonNullable<StorefrontPageRepository["createOrReuseVehicleVitrine"]>
    >(async () => page);
    await createOrReuseVehicleVitrine(
      context(["inventory.read", "store_public_site.manage"]),
      { listingId: listing.id, visible: true },
      {
        pageRepository: createPageRepository(createOrReuse),
        publicRepository: createPublicRepository({ media: [] }),
      },
    );

    const components = createOrReuse.mock.calls[0]?.[1].components ?? [];
    const gallery = components.find(
      (component) => component.type === "gallery",
    );
    expect(gallery?.props.images).toEqual([
      expect.objectContaining({ url: DEFAULT_STOREFRONT_VEHICLE_IMAGE }),
    ]);
    expect(JSON.stringify(components)).not.toContain("R$");
  });

  it("refuses a listing outside the scoped public projection", async () => {
    const publicRepository = createPublicRepository();
    vi.mocked(publicRepository.findPublicListingDetailById!).mockResolvedValue(
      null,
    );
    await expect(
      createOrReuseVehicleVitrine(
        context(["inventory.read", "store_public_site.manage"]),
        { listingId: listing.id, visible: true },
        {
          pageRepository: createPageRepository(vi.fn(async () => page)),
          publicRepository,
        },
      ),
    ).rejects.toBeInstanceOf(StorefrontVehicleVitrineSourceNotFoundError);
  });
});

const page: StorefrontCustomPage = {
  components: [],
  id: "page_1",
  order: 0,
  slug: "vitrine-sedan-listing",
  title: "Sedan - Oferta Exclusiva",
  visible: true,
};

const listing: PublicVehicleListingDetail = {
  commercialTags: [],
  condition: "used" as const,
  description: "Descrição pública",
  doors: 4,
  engineAspiration: null,
  engineDisplacement: "2.0",
  fuelType: "flex",
  heroMedia: null,
  id: "00000000-0000-4000-8000-000000000003",
  manufactureYear: 2024,
  media: [
    {
      altText: "Foto pública",
      displayOrder: 0,
      kind: "photo" as const,
      unitColorName: null,
      unitId: "unit_1",
      url: "https://cdn.test/public.jpg",
    },
  ],
  mediaGroups: [],
  mileageKm: 12000,
  modelYear: 2025,
  priceCents: 10000000,
  slug: "sedan",
  status: "available" as const,
  thumbnailUrl: "https://cdn.test/public.jpg",
  title: "Sedan",
  transmission: "automatic",
  trimName: null,
  videoUrl: null,
};

function context(permissions: readonly string[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    permissions: permissions as never,
    request: { requestId: "req_1" },
    storeId: "00000000-0000-4000-8000-000000000002" as never,
    tenantId: "00000000-0000-4000-8000-000000000001" as never,
  });
}

function createPublicRepository(
  overrides: Partial<PublicVehicleListingDetail> = {},
): PublicStorefrontRepository {
  return {
    findPublicListingDetail: vi.fn(async () => null),
    findPublicListingDetailById: vi.fn<
      NonNullable<PublicStorefrontRepository["findPublicListingDetailById"]>
    >(async () => ({ ...listing, ...overrides })),
    findPublicSiteBySlug: vi.fn(async () => null),
    findPublicStoreBySlug: vi.fn(async () => null),
    listPublicListings: vi.fn(async () => []),
  };
}

function createPageRepository(
  createOrReuseVehicleVitrine: NonNullable<
    StorefrontPageRepository["createOrReuseVehicleVitrine"]
  >,
): StorefrontPageRepository {
  return {
    createCustomPage: vi.fn(async () => page),
    createOrReuseVehicleVitrine,
    deleteCustomPage: vi.fn(async () => false),
    findCustomPageById: vi.fn(async () => null),
    findPublicCustomPageBySlug: vi.fn(async () => null),
    listCustomPages: vi.fn(async () => []),
    updateCustomPage: vi.fn(async () => null),
  };
}
