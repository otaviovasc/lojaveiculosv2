import type {
  StoreId,
  TenantId,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

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

export type PublicStorefrontSettingsContact = PublicStorefrontContact & {
  addressCity: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  businessHours: Record<string, unknown>;
};

export type PublicStorefrontSite = {
  heroImageUrl: string | null;
  layoutKey: string;
  seoDescription: string | null;
  seoTitle: string | null;
  theme: Record<string, unknown>;
};

export type PublicStorefrontSiteSnapshot = {
  contact: PublicStorefrontSettingsContact;
  site: PublicStorefrontSite;
  store: PublicStorefrontStore & { publicUrl: string };
};

export type PublicStorefrontSiteResult = {
  contact: PublicStorefrontSettingsContact;
  site: PublicStorefrontSite;
  store: PublicStorefrontPublicStore;
};

export type PublicVehicleListing = {
  commercialTags: readonly string[];
  condition: "certified_pre_owned" | "new" | "used";
  description: string | null;
  doors: number | null;
  engineAspiration: VehicleEngineAspiration | null;
  engineDisplacement: VehicleEngineDisplacement | null;
  fuelType: string | null;
  heroMedia: PublicVehicleMedia | null;
  id: string;
  manufactureYear: number | null;
  media: readonly PublicVehicleMedia[];
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  slug: string;
  status: "available";
  thumbnailUrl: string | null;
  title: string;
  transmission: string | null;
  trimName: string | null;
  videoUrl: string | null;
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
  mediaGroups: readonly PublicVehicleMediaGroup[];
};

export type FindPublicListingsInput = {
  limit: number;
  offset?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindPublicListingDetailInput = {
  listingSlug: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindPublicListingDetailByIdInput = {
  listingId: string;
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
  findPublicListingDetailById?: (
    input: FindPublicListingDetailByIdInput,
  ) => Promise<PublicVehicleListingDetail | null>;
  listPublicListings: (
    input: FindPublicListingsInput,
  ) => Promise<readonly PublicVehicleListing[]>;
};
