import type {
  VehicleCatalogFipeCodeDetails,
  VehicleCatalogOption,
  VehicleCatalogPriceHistory,
  VehicleCatalogReference,
  VehicleCatalogSnapshot,
  VehicleCatalogType,
  VehicleCatalogYearOption,
} from "../../domains/vehicle/ports/vehicleCatalogProvider.js";

export type FipeOption = {
  code: string | number;
  name: string;
};

export type FipeReference = {
  code: string | number;
  month: string;
};

export type FipePriceHistoryEntry = {
  month: string;
  price: string;
  reference: string | number;
};

export type FipeVehicleDetails = {
  brand?: string | null;
  codeFipe?: string | null;
  fuel?: string | null;
  fuelAcronym?: string | null;
  model?: string | null;
  modelYear?: number | null;
  price?: string | null;
  priceHistory?: FipePriceHistoryEntry[] | null;
  referenceMonth?: string | null;
};

type BrandLogoUrlResolver = (brandName: string) => string | null;

export function toReference(input: FipeReference): VehicleCatalogReference {
  return {
    code: String(input.code),
    month: input.month,
  };
}

export function toOption(
  input: FipeOption,
  imageUrl: string | null = null,
): VehicleCatalogOption {
  return {
    code: String(input.code),
    imageUrl,
    name: input.name,
  };
}

export function toBrandOption(
  input: FipeOption,
  brandLogoUrlResolver: BrandLogoUrlResolver,
): VehicleCatalogOption {
  return toOption(input, brandLogoUrlResolver(input.name));
}

export function toYearOption(input: FipeOption): VehicleCatalogYearOption {
  const code = String(input.code);
  const modelYear = Number.parseInt(code.slice(0, 4), 10);
  const fuelCode = code.includes("-") ? (code.split("-")[1] ?? null) : null;
  return {
    ...toOption(input),
    fuelCode,
    modelYear: Number.isFinite(modelYear) ? modelYear : null,
  };
}

export function toCatalogSnapshot(input: {
  brandCode: string;
  details: FipeVehicleDetails;
  modelCode: string;
  vehicleType: VehicleCatalogType;
  yearCode: string;
}): VehicleCatalogSnapshot {
  return {
    brandCode: input.brandCode,
    brandLogoUrl: null,
    brandName: input.details.brand ?? "",
    fipeCode: input.details.codeFipe ?? null,
    fuel: input.details.fuel ?? null,
    modelCode: input.modelCode,
    modelName: input.details.model ?? "",
    modelYear: input.details.modelYear ?? null,
    priceCents: parseFipePriceCents(input.details.price ?? null),
    referenceMonth: input.details.referenceMonth ?? null,
    source: "fipe",
    vehicleType: input.vehicleType,
    yearCode: input.yearCode,
    yearName: input.details.modelYear ? String(input.details.modelYear) : "",
  };
}

export function toFipeCodeDetails(input: {
  details: FipeVehicleDetails;
  fipeCode: string;
  vehicleType: VehicleCatalogType;
  yearCode: string;
}): VehicleCatalogFipeCodeDetails {
  return {
    brandName: input.details.brand ?? null,
    fipeCode: input.details.codeFipe ?? input.fipeCode,
    fuel: input.details.fuel ?? null,
    fuelAcronym: input.details.fuelAcronym ?? null,
    modelName: input.details.model ?? null,
    modelYear: input.details.modelYear ?? null,
    priceCents: parseFipePriceCents(input.details.price ?? null),
    priceLabel: input.details.price ?? null,
    referenceMonth: input.details.referenceMonth ?? null,
    source: "fipe",
    vehicleType: input.vehicleType,
    yearCode: input.yearCode,
  };
}

export function toPriceHistory(input: {
  details: FipeVehicleDetails;
  fipeCode: string;
  vehicleType: VehicleCatalogType;
  yearCode: string;
}): VehicleCatalogPriceHistory {
  return {
    brandName: input.details.brand ?? null,
    entries: (input.details.priceHistory ?? []).map((entry) => ({
      priceCents: parseFipePriceCents(entry.price),
      priceLabel: entry.price,
      referenceCode: String(entry.reference),
      referenceMonth: entry.month,
    })),
    fipeCode: input.details.codeFipe ?? input.fipeCode,
    fuel: input.details.fuel ?? null,
    modelName: input.details.model ?? null,
    modelYear: input.details.modelYear ?? null,
    source: "fipe",
    vehicleType: input.vehicleType,
    yearCode: input.yearCode,
  };
}

export function parseFipePriceCents(value: string | null): number | null {
  const normalized = (value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
