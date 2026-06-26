import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type PublicStorefrontStore = {
  id: StoreId;
  name: string;
  slug: string;
  tenantId: TenantId;
};

export type PublicStorefrontPublicStore = {
  name: string;
  publicUrl: string;
  slug: string;
};

export type PublicStorefrontStoreSummary = {
  name: string;
  slug: string;
};

export type PublicStorefrontContact = {
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappPhone: string | null;
  whatsappUrl: string | null;
};

export type PublicStorefrontSite = {
  heroImageUrl: string | null;
  layoutKey: string;
  seoDescription: string | null;
  seoTitle: string | null;
  theme: Record<string, unknown>;
};

export type PublicStorefrontSiteSnapshot = {
  contact: PublicStorefrontContact;
  site: PublicStorefrontSite;
  store: PublicStorefrontStore & { publicUrl: string };
};

export type PublicStorefrontSiteResult = {
  contact: PublicStorefrontContact;
  site: PublicStorefrontSite;
  store: PublicStorefrontPublicStore;
};

export type PublicVehicleListing = {
  description: string | null;
  id: string;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  slug: string;
  status: "available";
  thumbnailUrl: string | null;
  title: string;
};

export type PublicVehicleMedia = {
  altText: string | null;
  displayOrder: number;
  kind: "document_preview" | "photo" | "video";
  unitColorName: string | null;
  unitId: string;
  url: string;
};

export type PublicVehicleMediaGroup = {
  colorName: string | null;
  media: readonly PublicVehicleMedia[];
  unitId: string;
};

export type PublicVehicleListingDetail = PublicVehicleListing & {
  media: readonly PublicVehicleMedia[];
  mediaGroups: readonly PublicVehicleMediaGroup[];
};

export type FindPublicListingsInput = {
  limit: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindPublicListingDetailInput = {
  listingSlug: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type PublicStorefrontRepository = {
  findPublicSiteBySlug: (
    storeSlug: string,
  ) => Promise<PublicStorefrontSiteSnapshot | null>;
  findPublicStoreBySlug: (
    storeSlug: string,
  ) => Promise<PublicStorefrontStore | null>;
  findPublicListingDetail: (
    input: FindPublicListingDetailInput,
  ) => Promise<PublicVehicleListingDetail | null>;
  listPublicListings: (
    input: FindPublicListingsInput,
  ) => Promise<readonly PublicVehicleListing[]>;
};
