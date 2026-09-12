import type {
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

export type PublicVehicleListing = {
  commercialTags: readonly string[];
  condition: "certified_pre_owned" | "new" | "used";
  description: string | null;
  doors: number | null;
  engineAspiration: VehicleEngineAspiration | null;
  engineDisplacement: VehicleEngineDisplacement | null;
  fuelType: string | null;
  heroMedia: PublicVehicleMedia | null;
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

export type PublicStorefrontData = {
  listings: readonly PublicVehicleListing[];
  store: {
    name: string;
    slug: string;
  };
};

export type PublicStorefrontContactData = {
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappPhone: string | null;
  whatsappUrl: string | null;
};

export type PublicStorefrontSettingsContactData =
  PublicStorefrontContactData & {
    addressCity: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressState: string | null;
    addressZipCode: string | null;
    businessHours: Record<string, unknown>;
  };

export type PublicStorefrontSettingsData = {
  contact: PublicStorefrontSettingsContactData;
  site: {
    heroImageUrl: string | null;
    layoutKey: string;
    seoDescription: string | null;
    seoTitle: string | null;
    theme: Record<string, unknown>;
  };
  store: {
    name: string;
    publicUrl: string;
    slug: string;
  };
};

export type PublicStorefrontPageData = PublicStorefrontData & {
  settings: PublicStorefrontSettingsData;
};

export type PublicStorefrontListingDetailData = {
  listing: PublicVehicleListingDetail;
  store: PublicStorefrontData["store"];
};

export type PublicStorefrontLeadInput = {
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  formStartedAt: number;
  message: string;
  website: string;
};

export type PublicStorefrontLeadResult = {
  deduplicated: boolean;
  lead: {
    id: string;
    source: "public_site";
    status: string;
  };
};

export type PublicStorefrontCustomPageData = {
  config: StorefrontBuilderConfig;
  contact: PublicStorefrontContactData;
  page: Omit<StorefrontCustomPage, "secretToken">;
  sitePublished: boolean;
  store: PublicStorefrontSettingsData["store"];
  vehicles: readonly StorefrontBuilderVehicle[];
};
