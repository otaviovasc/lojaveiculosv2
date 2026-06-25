import {
  getVehicleColorLabel,
  normalizeVehicleEngineAspiration,
  normalizeVehicleEngineDisplacement,
  normalizeVehicleColor,
} from "@lojaveiculosv2/shared";
import type { InventoryCatalogSnapshot } from "./catalogTypes";
import type { InventoryFormState } from "./formModel";
import { parsePriceCents } from "./formModel";
import {
  idealSellPriceCents,
  recommendedAcquisitionCents,
} from "./inventoryPricing";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
} from "./enrichmentTypes";

export function applyPlateLookupToForm(
  form: InventoryFormState,
  lookup: InventoryPlateLookupResponse,
): InventoryFormState {
  const vehicle = lookup.vehicle;
  const catalog = createCatalogFromLookup(lookup) ?? form.catalog;
  const title = createTitleFromLookup(lookup) || form.title;

  return {
    ...form,
    catalog,
    colorName: normalizeVehicleColor(vehicle.color) || form.colorName,
    engineAspiration:
      normalizeVehicleEngineAspiration(vehicle.aspiration ?? vehicle.engine) ||
      form.engineAspiration,
    engineDisplacement:
      normalizeVehicleEngineDisplacement(vehicle.engine) ||
      form.engineDisplacement,
    fuelType: normalizeFuelType(vehicle.fuel) ?? form.fuelType,
    manufactureYear:
      vehicle.manufactureYear !== null
        ? String(vehicle.manufactureYear)
        : form.manufactureYear,
    mileageKm:
      vehicle.mileageKm !== null ? String(vehicle.mileageKm) : form.mileageKm,
    modelYear:
      vehicle.modelYear !== null ? String(vehicle.modelYear) : form.modelYear,
    plate: lookup.plate || form.plate,
    title,
    transmission:
      normalizeTransmission(vehicle.transmission) ?? form.transmission,
    trimName: vehicle.version ?? vehicle.model ?? form.trimName,
    vin: shouldFillChassis(vehicle.chassis) ? vehicle.chassis : form.vin,
  };
}

export function createResaleAnalysisInput(
  form: InventoryFormState,
  lookup: InventoryPlateLookupResponse | null,
): InventoryResaleAnalysisRequest {
  const fipePriceCents =
    form.catalog?.priceCents ?? lookup?.fipe?.priceCents ?? null;
  return {
    acquisitionPriceCents: parsePriceCents(form.acquisitionPrice),
    bodyType: lookup?.vehicle.bodyType ?? null,
    brand: form.catalog?.brandName ?? lookup?.vehicle.brand ?? null,
    city: lookup?.vehicle.city ?? null,
    color:
      getVehicleColorLabel(form.colorName) || (lookup?.vehicle.color ?? null),
    fipePriceCents,
    fuel: form.catalog?.fuel ?? lookup?.vehicle.fuel ?? null,
    manufactureYear: parseInteger(form.manufactureYear),
    marketContext: null,
    metadata: lookup?.metadata ?? [],
    mileageKm: lookup?.vehicle.mileageKm ?? null,
    model: form.catalog?.modelName ?? lookup?.vehicle.model ?? null,
    modelYear: parseInteger(form.modelYear),
    origin: lookup?.vehicle.origin ?? null,
    plate: nullableText(form.plate || lookup?.plate || ""),
    recommendedAcquisitionPriceCents:
      recommendedAcquisitionCents(fipePriceCents),
    recommendedSellingPriceCents: idealSellPriceCents(fipePriceCents),
    sellingPriceCents: parsePriceCents(form.price),
    state: lookup?.vehicle.state ?? null,
    transmission: lookup?.vehicle.transmission ?? null,
    vehicleType: lookup?.vehicle.vehicleType ?? null,
    version: form.trimName || lookup?.vehicle.version || null,
  };
}

export function hasEnoughDataForAnalysis(
  form: InventoryFormState,
  lookup: InventoryPlateLookupResponse | null,
) {
  const input = createResaleAnalysisInput(form, lookup);
  return Boolean(input.brand && input.model && input.modelYear);
}

function createCatalogFromLookup(
  lookup: InventoryPlateLookupResponse,
): InventoryCatalogSnapshot | null {
  const fipe = lookup.fipe;
  if (!fipe?.priceCents && !fipe?.code) return null;
  return {
    brandCode: null,
    brandName: fipe.brandName ?? lookup.vehicle.brand,
    fipeCode: fipe.code,
    fuel: fipe.fuel ?? lookup.vehicle.fuel,
    modelCode: null,
    modelName: fipe.modelName ?? lookup.vehicle.model,
    modelYear: fipe.modelYear ?? lookup.vehicle.modelYear,
    priceCents: fipe.priceCents,
    referenceMonth: fipe.referenceMonth,
    source: "fipe",
    vehicleType: "cars",
    yearCode: null,
    yearName:
      fipe.modelYear !== null
        ? String(fipe.modelYear)
        : lookup.vehicle.modelYear !== null
          ? String(lookup.vehicle.modelYear)
          : null,
  };
}

function createTitleFromLookup(lookup: InventoryPlateLookupResponse) {
  const { brand, model, modelYear, version } = lookup.vehicle;
  return [brand, removeBrandPrefix(model, brand), version, modelYear]
    .filter((value): value is string | number => value !== null && value !== "")
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(" ");
}

function removeBrandPrefix(value: string | null, brand: string | null) {
  if (!value || !brand) return value;
  return value.toLowerCase().startsWith(brand.toLowerCase())
    ? value.slice(brand.length).replace(/^[/\s-]+/, "")
    : value;
}

function shouldFillChassis(value: string | null): value is string {
  return Boolean(value && !value.includes("*"));
}

function parseInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeFuelType(value: string | null) {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (normalized.includes("flex")) return "flex";
  if (normalized.includes("diesel")) return "diesel";
  if (normalized.includes("eletric")) return "electric";
  if (normalized.includes("hibrid") || normalized.includes("hybrid")) {
    return "hybrid";
  }
  if (normalized.includes("etanol") || normalized.includes("alcool")) {
    return "ethanol";
  }
  if (normalized.includes("gasol")) return "gasoline";
  return "other";
}

function normalizeTransmission(value: string | null) {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (normalized.includes("cvt")) return "cvt";
  if (normalized.includes("automatiz")) return "automated";
  if (normalized.includes("auto")) return "automatic";
  if (normalized.includes("manual")) return "manual";
  return "other";
}

function normalize(value: string | null) {
  return value
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
