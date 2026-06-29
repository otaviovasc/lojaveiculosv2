import type {
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";

export type PublicVehicleListing = {
  description: string | null;
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

export type PublicStorefrontData = {
  listings: readonly PublicVehicleListing[];
  store: {
    name: string;
    slug: string;
  };
};

export type PublicStorefrontSettingsData = {
  contact: {
    city: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    whatsappPhone: string | null;
    whatsappUrl: string | null;
  };
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
  buyerEmail?: string;
  buyerName: string;
  buyerPhone?: string;
  message?: string;
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
  contact: PublicStorefrontSettingsData["contact"];
  page: Omit<StorefrontCustomPage, "secretToken">;
  sitePublished: boolean;
  store: PublicStorefrontSettingsData["store"];
  vehicles: readonly StorefrontBuilderVehicle[];
};
