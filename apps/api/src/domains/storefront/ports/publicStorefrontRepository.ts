import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type PublicStorefrontStore = {
  id: StoreId;
  name: string;
  slug: string;
  tenantId: TenantId;
};

export type PublicVehicleListing = {
  description: string | null;
  listingId: string;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  slug: string;
  status: "available";
  thumbnailUrl: string | null;
  title: string;
};

export type FindPublicListingsInput = {
  limit: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type PublicStorefrontRepository = {
  findPublicStoreBySlug: (
    storeSlug: string,
  ) => Promise<PublicStorefrontStore | null>;
  listPublicListings: (
    input: FindPublicListingsInput,
  ) => Promise<readonly PublicVehicleListing[]>;
};
