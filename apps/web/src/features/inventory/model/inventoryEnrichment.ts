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
    manufactureYear:
      vehicle.manufactureYear !== null
        ? String(vehicle.manufactureYear)
        : form.manufactureYear,
    modelYear:
      vehicle.modelYear !== null ? String(vehicle.modelYear) : form.modelYear,
    plate: lookup.plate || form.plate,
    title,
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
    brand: form.catalog?.brandName ?? lookup?.vehicle.brand ?? null,
    color: lookup?.vehicle.color ?? null,
    fipePriceCents,
    fuel: form.catalog?.fuel ?? lookup?.vehicle.fuel ?? null,
    manufactureYear: parseInteger(form.manufactureYear),
    metadata: lookup?.metadata ?? [],
    mileageKm: lookup?.vehicle.mileageKm ?? null,
    model: form.catalog?.modelName ?? lookup?.vehicle.model ?? null,
    modelYear: parseInteger(form.modelYear),
    plate: nullableText(form.plate || lookup?.plate || ""),
    recommendedAcquisitionPriceCents:
      recommendedAcquisitionCents(fipePriceCents),
    recommendedSellingPriceCents: idealSellPriceCents(fipePriceCents),
    sellingPriceCents: parsePriceCents(form.price),
    transmission: lookup?.vehicle.transmission ?? null,
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

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
