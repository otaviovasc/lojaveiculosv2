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

export type PublicVehicleMedia = {
  altText: string | null;
  displayOrder: number;
  kind: "document_preview" | "photo" | "video";
  mediaId: string;
  url: string;
};

export type PublicVehicleListingDetail = PublicVehicleListing & {
  media: readonly PublicVehicleMedia[];
};

export type PublicStorefrontData = {
  listings: readonly PublicVehicleListing[];
  store: {
    id: string;
    name: string;
    slug: string;
    tenantId: string;
  };
};

export type PublicStorefrontListingDetailData = {
  listing: PublicVehicleListingDetail;
  store: PublicStorefrontData["store"];
};
