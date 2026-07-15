import type {
  PublicStorefrontStore,
  PublicVehicleMedia,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type {
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

export type StoreRow = {
  id: PublicStorefrontStore["id"];
  name: string;
  slug: string;
  tenantId: PublicStorefrontStore["tenantId"];
};

export type ListingRow = {
  listingMetadata: unknown;
  condition: "certified_pre_owned" | "new" | "used";
  description: string | null;
  doors: number | null;
  engineAspiration: VehicleEngineAspiration | null;
  engineDisplacement: VehicleEngineDisplacement | null;
  featuredUntil: Date | null;
  fuelType: string | null;
  listingId: string;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  slug: string | null;
  title: string;
  transmission: string | null;
  trimName: string | null;
};

export type MediaRow = {
  altText: string | null;
  displayOrder: number;
  kind: PublicVehicleMedia["kind"];
  unitId: string;
  url: string;
};

export type UnitRow = {
  colorName: string | null;
  id: string;
  status:
    | "acquired"
    | "available"
    | "delivered"
    | "inactive"
    | "in_preparation"
    | "reserved"
    | "sold";
  stockNumber: string | null;
};

export type PublicSiteRow = {
  addressCity: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  customDomain: string | null;
  heroImageUrl: string | null;
  layoutKey: string;
  name: string;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  storeId: PublicStorefrontStore["id"];
  tenantId: PublicStorefrontStore["tenantId"];
  theme: unknown;
  whatsappPhone: string | null;
};

type SelectLimitBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectOrderBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectWhereResultBuilder<Row> = SelectLimitBuilder<Row> & {
  orderBy: (...columns: unknown[]) => SelectOrderBuilder<Row>;
};

type SelectWhereBuilder<Row> = {
  innerJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  leftJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  orderBy: (...columns: unknown[]) => SelectOrderBuilder<Row>;
  where: (condition: unknown) => SelectWhereResultBuilder<Row>;
};

type SelectFromBuilder<Row> = {
  from: (table: unknown) => SelectWhereBuilder<Row>;
};

export type DrizzlePublicStorefrontClient = {
  select: {
    (selection: {
      addressCity: unknown;
      contactEmail: unknown;
      contactPhone: unknown;
      customDomain: unknown;
      heroImageUrl: unknown;
      layoutKey: unknown;
      name: unknown;
      seoDescription: unknown;
      seoTitle: unknown;
      slug: unknown;
      storeId: unknown;
      tenantId: unknown;
      theme: unknown;
      whatsappPhone: unknown;
    }): SelectFromBuilder<PublicSiteRow>;
    (selection: {
      id: unknown;
      name: unknown;
      slug: unknown;
      tenantId: unknown;
    }): SelectFromBuilder<StoreRow>;
    (selection: {
      listingMetadata: unknown;
      condition: unknown;
      description: unknown;
      doors: unknown;
      engineAspiration: unknown;
      engineDisplacement: unknown;
      featuredUntil: unknown;
      fuelType: unknown;
      listingId: unknown;
      manufactureYear: unknown;
      mileageKm: unknown;
      modelYear: unknown;
      priceCents: unknown;
      slug: unknown;
      title: unknown;
      transmission: unknown;
      trimName: unknown;
    }): SelectFromBuilder<ListingRow>;
    (selection: {
      altText: unknown;
      displayOrder: unknown;
      kind: unknown;
      unitId: unknown;
      url: unknown;
    }): SelectFromBuilder<MediaRow>;
    (selection: {
      colorName: unknown;
      id: unknown;
      status: unknown;
      stockNumber: unknown;
    }): SelectFromBuilder<UnitRow>;
  };
};
