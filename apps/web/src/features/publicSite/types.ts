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
  url: string;
};

export type PublicVehicleListingDetail = PublicVehicleListing & {
  media: readonly PublicVehicleMedia[];
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
