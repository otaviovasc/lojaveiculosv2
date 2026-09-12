export type MarketplaceCatalogSnapshot = {
  brandCode: string | null;
  brandName: string | null;
  fipeCode: string | null;
  fuel: string | null;
  modelCode: string | null;
  modelName: string | null;
  modelYear: number | null;
  referenceMonth: string | null;
  source: "fipe" | null;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
  yearCode: string | null;
  yearName: string | null;
};

export type MarketplaceListingProjection = {
  catalog: MarketplaceCatalogSnapshot | null;
  condition: "certified_pre_owned" | "new" | "used";
  contactPhone: string | null;
  description: string | null;
  doors: number | null;
  fuelType:
    | "diesel"
    | "electric"
    | "ethanol"
    | "flex"
    | "gasoline"
    | "hybrid"
    | "other"
    | null;
  isVisibleOnPublicSite: boolean;
  licensePlate: string | null;
  listingId: string;
  locationZipCode: string | null;
  mediaUrls: readonly string[];
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  publicSlug: string | null;
  selectedMedia: readonly { altText: string | null; url: string }[];
  selectedUnitId: string | null;
  status:
    | "archived"
    | "draft"
    | "in_preparation"
    | "published"
    | "sold_out"
    | "unpublished";
  stockLabel: string | null;
  title: string;
  trimName: string | null;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
};
