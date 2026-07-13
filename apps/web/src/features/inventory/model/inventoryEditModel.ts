import type {
  InventoryListing,
  InventoryListingDetail,
  InventoryUnit,
  UpdateInventoryListingInput,
  UpdateInventoryUnitInput,
} from "./types";
import { parsePriceCents } from "./formModel";

export type InventoryEditState = {
  catalog: InventoryListing["catalog"];
  colorName: InventoryUnit["colorName"] | "";
  description: string;
  doors: string;
  engineAspiration: NonNullable<InventoryListing["engineAspiration"]> | "";
  engineDisplacement: NonNullable<InventoryListing["engineDisplacement"]> | "";
  fuelType: NonNullable<InventoryListing["fuelType"]> | "";
  manufactureYear: string;
  mileageKm: string;
  modelYear: string;
  plate: string;
  price: string;
  status: InventoryListing["status"];
  stockNumber: string;
  title: string;
  transmission: NonNullable<InventoryListing["transmission"]> | "";
  trimName: string;
  unitStatus: InventoryUnit["status"];
  vin: string;
};

export function createInventoryEditState(
  detail: InventoryListingDetail,
  unit: InventoryUnit | null,
): InventoryEditState {
  const listing = detail.listing;
  return {
    catalog: listing.catalog,
    colorName: unit?.colorName ?? "",
    description: listing.description ?? "",
    doors: optionalNumberText(listing.doors),
    engineAspiration: listing.engineAspiration ?? "",
    engineDisplacement: listing.engineDisplacement ?? "",
    fuelType: listing.fuelType ?? "",
    manufactureYear: optionalNumberText(listing.manufactureYear),
    mileageKm: optionalNumberText(listing.mileageKm),
    modelYear: optionalNumberText(listing.modelYear),
    plate: unit?.plate ?? listing.plate ?? "",
    price:
      listing.priceCents === null
        ? ""
        : String((listing.priceCents / 100).toFixed(2)).replace(".", ","),
    status: listing.status,
    stockNumber: unit?.stockNumber ?? "",
    title: listing.title,
    transmission: listing.transmission ?? "",
    trimName: listing.trimName ?? "",
    unitStatus: unit?.status ?? "available",
    vin: unit?.vin ?? "",
  };
}

export function validateInventoryEditState(form: InventoryEditState) {
  if (!form.title.trim()) return "Informe o título do anúncio.";
  if (form.price.trim() && parsePriceCents(form.price) === null) {
    return "Informe um preço válido.";
  }
  if (!isOptionalIntegerBetween(form.manufactureYear, 1886, 2100)) {
    return "Informe um ano de fabricação entre 1886 e 2100.";
  }
  if (!isOptionalIntegerBetween(form.modelYear, 1886, 2100)) {
    return "Informe um ano do modelo entre 1886 e 2100.";
  }
  if (!isOptionalIntegerBetween(form.mileageKm, 0)) {
    return "Informe uma quilometragem válida.";
  }
  if (!isOptionalIntegerBetween(form.doors, 1, 12)) {
    return "Informe uma quantidade de portas entre 1 e 12.";
  }
  return null;
}

export function buildListingEditInput(
  form: InventoryEditState,
  listing: InventoryListing,
): UpdateInventoryListingInput | null {
  const next: InventoryListing = {
    ...listing,
    catalog: form.catalog,
    description: nullableText(form.description),
    doors: parseOptionalInteger(form.doors),
    engineAspiration: form.engineAspiration || null,
    engineDisplacement: form.engineDisplacement || null,
    fuelType: form.fuelType || null,
    manufactureYear: parseOptionalInteger(form.manufactureYear),
    mileageKm: parseOptionalInteger(form.mileageKm),
    modelYear: parseOptionalInteger(form.modelYear),
    priceCents: parsePriceCents(form.price),
    status: form.status,
    title: form.title.trim(),
    transmission: form.transmission || null,
    trimName: nullableText(form.trimName),
  };
  const input: UpdateInventoryListingInput = {};
  setChanged(input, "catalog", listing.catalog, next.catalog, catalogsEqual);
  setChanged(input, "description", listing.description, next.description);
  setChanged(input, "doors", listing.doors, next.doors);
  setChanged(
    input,
    "engineAspiration",
    listing.engineAspiration,
    next.engineAspiration,
  );
  setChanged(
    input,
    "engineDisplacement",
    listing.engineDisplacement,
    next.engineDisplacement,
  );
  setChanged(input, "fuelType", listing.fuelType, next.fuelType);
  setChanged(
    input,
    "manufactureYear",
    listing.manufactureYear,
    next.manufactureYear,
  );
  setChanged(input, "mileageKm", listing.mileageKm, next.mileageKm);
  setChanged(input, "modelYear", listing.modelYear, next.modelYear);
  setChanged(input, "priceCents", listing.priceCents, next.priceCents);
  setChanged(input, "status", listing.status, next.status);
  setChanged(input, "title", listing.title, next.title);
  setChanged(input, "transmission", listing.transmission, next.transmission);
  setChanged(input, "trimName", listing.trimName, next.trimName);
  return hasKeys(input) ? input : null;
}

export function buildUnitEditInput(
  form: InventoryEditState,
  unit: InventoryUnit,
): UpdateInventoryUnitInput | null {
  const input: UpdateInventoryUnitInput = {};
  setChanged(input, "colorName", unit.colorName, form.colorName || null);
  setChanged(input, "plate", unit.plate, nullablePlate(form.plate));
  setChanged(
    input,
    "stockNumber",
    unit.stockNumber,
    nullableText(form.stockNumber),
  );
  setChanged(input, "vin", unit.vin, nullableText(form.vin));
  setChanged(input, "status", unit.status, form.unitStatus);
  return hasKeys(input) ? input : null;
}

function setChanged<ObjectType extends object, Key extends keyof ObjectType>(
  target: ObjectType,
  key: Key,
  previous: ObjectType[Key],
  next: ObjectType[Key],
  equal: (left: ObjectType[Key], right: ObjectType[Key]) => boolean = Object.is,
) {
  if (!equal(previous, next)) target[key] = next;
}

function catalogsEqual(
  left: InventoryListing["catalog"] | undefined,
  right: InventoryListing["catalog"] | undefined,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasKeys(value: object) {
  return Object.keys(value).length > 0;
}

function nullablePlate(value: string) {
  return nullableText(value)?.toUpperCase() ?? null;
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalNumberText(value: number | null) {
  return value === null ? "" : String(value);
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isOptionalIntegerBetween(
  value: string,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
) {
  if (!value.trim()) return true;
  const parsed = parseOptionalInteger(value);
  return parsed !== null && parsed >= minimum && parsed <= maximum;
}
