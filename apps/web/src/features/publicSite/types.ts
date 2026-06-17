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

export type PublicStorefrontData = {
  listings: readonly PublicVehicleListing[];
  store: {
    id: string;
    name: string;
    slug: string;
    tenantId: string;
  };
};
