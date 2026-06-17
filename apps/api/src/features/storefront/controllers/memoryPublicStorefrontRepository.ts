import type {
  PublicStorefrontRepository,
  PublicStorefrontStore,
  PublicVehicleListing,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";

const demoStore = {
  id: "store_1" as never,
  name: "Loja Demo",
  slug: "demo",
  tenantId: "tenant_1" as never,
} satisfies PublicStorefrontStore;

const demoListings = [
  {
    description: "Unico dono, revisoes em dia e pronto para venda.",
    listingId: "listing_1",
    manufactureYear: 2022,
    mileageKm: 32000,
    modelYear: 2023,
    priceCents: 12690000,
    slug: "fiat-toro-2023",
    status: "available",
    thumbnailUrl: null,
    title: "Fiat Toro Volcano 2023",
  },
  {
    description: "SUV completo com multimidia, camera e garantia.",
    listingId: "listing_2",
    manufactureYear: 2021,
    mileageKm: 41000,
    modelYear: 2022,
    priceCents: 9870000,
    slug: "jeep-renegade-2022",
    status: "available",
    thumbnailUrl: null,
    title: "Jeep Renegade Longitude 2022",
  },
] as const satisfies readonly PublicVehicleListing[];

export function createMemoryPublicStorefrontRepository(): PublicStorefrontRepository {
  return {
    async findPublicStoreBySlug(storeSlug) {
      return storeSlug === demoStore.slug ? demoStore : null;
    },
    async listPublicListings(input) {
      return demoListings.slice(0, input.limit);
    },
  };
}
