import type {
  PublicStorefrontRepository,
  PublicVehicleListingDetail,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";

export function publicStorefrontRepository(
  prices: Readonly<Record<string, number | null>> = {
    listing_1: 12_000_000,
  },
): PublicStorefrontRepository {
  const listings = Object.entries(prices).map(([id, priceCents]) =>
    publicListing(id, priceCents),
  );
  return {
    async findPublicListingDetail() {
      return null;
    },
    async findPublicListingDetailById(input) {
      return listings.find((listing) => listing.id === input.listingId) ?? null;
    },
    async findPublicSiteBySlug() {
      return null;
    },
    async findPublicStoreBySlug() {
      return null;
    },
    async listPublicListings(input) {
      return listings.slice(
        input.offset ?? 0,
        (input.offset ?? 0) + input.limit,
      );
    },
  };
}

function publicListing(
  id: string,
  priceCents: number | null,
): PublicVehicleListingDetail {
  return {
    commercialTags: [],
    condition: "used",
    description: "Veículo publicado",
    doors: null,
    engineAspiration: null,
    engineDisplacement: null,
    fuelType: null,
    heroMedia: null,
    id,
    manufactureYear: null,
    media: [],
    mediaGroups: [],
    mileageKm: null,
    modelYear: null,
    priceCents,
    slug: id,
    status: "available",
    thumbnailUrl: null,
    title: "Fiat Toro",
    transmission: null,
    trimName: null,
    videoUrl: null,
  };
}
