import { createHash } from "node:crypto";
import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../ports/marketplaceRepository.js";

export type ProviderListingPayload = {
  attributes: Record<string, unknown>;
  body: Record<string, unknown>;
  mediaUrls: readonly string[];
  title: string;
};

export function createProviderListingPayload(input: {
  externalId?: string | null;
  listing: MarketplaceListingProjection;
  provider: MarketplaceProvider;
  settings: Record<string, unknown>;
}): ProviderListingPayload {
  if (input.provider === "mercado_livre") {
    return createMercadoLivrePayload(input.listing, input.settings);
  }
  return createOlxPayload(input.listing, input.settings, input.externalId);
}

function createMercadoLivrePayload(
  listing: MarketplaceListingProjection,
  settings: Record<string, unknown>,
): ProviderListingPayload {
  const categoryId = stringSetting(settings, "categoryId") ?? "MLB1744";
  const currencyId = stringSetting(settings, "currencyId") ?? "BRL";
  const price = listing.priceCents ? Math.round(listing.priceCents / 100) : 0;
  const attributes = mercadoLivreAttributes(listing);
  const body = {
    attributes,
    available_quantity: 1,
    buying_mode: "classified",
    category_id: categoryId,
    condition: listing.condition === "new" ? "new" : "used",
    currency_id: currencyId,
    description: { plain_text: listing.description ?? listing.title },
    pictures: listing.mediaUrls.map((source) => ({ source })),
    price,
    title: listing.title.slice(0, 60),
  };

  return {
    attributes: {
      attributeIds: attributes.map(({ id }) => id),
      categoryId,
      currencyId,
    },
    body,
    mediaUrls: listing.mediaUrls,
    title: listing.title,
  };
}

function mercadoLivreAttributes(listing: MarketplaceListingProjection) {
  return [
    { id: "BRAND", value_name: listing.catalog?.brandName },
    { id: "MODEL", value_name: listing.catalog?.modelName },
    { id: "TRIM", value_name: listing.trimName ?? listing.stockLabel },
    {
      id: "VEHICLE_YEAR",
      value_name: stringValue(listing.modelYear ?? listing.catalog?.modelYear),
    },
    {
      id: "VEHICLE_TYPE",
      value_name: marketplaceVehicleType(listing.vehicleType),
    },
    { id: "FUEL_TYPE", value_name: marketplaceFuelType(listing.fuelType) },
    { id: "DOORS", value_name: stringValue(listing.doors) },
    { id: "KILOMETERS", value_name: stringValue(listing.mileageKm) },
  ].filter((attribute): attribute is { id: string; value_name: string } =>
    Boolean(attribute.value_name),
  );
}

function createOlxPayload(
  listing: MarketplaceListingProjection,
  settings: Record<string, unknown>,
  externalId: string | null | undefined,
): ProviderListingPayload {
  const categoryId = olxCategory(listing.vehicleType);
  const mapping = objectSetting(settings, "providerMapping");
  const phone = olxPhone(listing.contactPhone);
  const plate = olxPlate(listing.licensePlate);
  const zipCode = olxZipCode(listing.locationZipCode);
  const params = {
    ...(listing.modelYear ? { regdate: String(listing.modelYear) } : {}),
    ...(listing.mileageKm !== null ? { mileage: listing.mileageKm } : {}),
    ...(olxFuelType(listing.fuelType)
      ? { fuel: olxFuelType(listing.fuelType) }
      : {}),
    ...(listing.vehicleType === "cars" && olxDoors(listing.doors)
      ? { doors: olxDoors(listing.doors) }
      : {}),
    ...(stringSetting(mapping, "providerBrandCode")
      ? { vehicle_brand: stringSetting(mapping, "providerBrandCode") }
      : {}),
    ...(stringSetting(mapping, "providerModelCode")
      ? { vehicle_model: stringSetting(mapping, "providerModelCode") }
      : {}),
    ...(stringSetting(mapping, "providerTrimCode")
      ? { vehicle_version: stringSetting(mapping, "providerTrimCode") }
      : {}),
    ...(plate && listing.condition !== "new" ? { vehicle_tag: plate } : {}),
    ...(listing.condition === "new" ? { zero_km: "1" } : {}),
  };
  const body = {
    Body: normalizedText(listing.description ?? listing.title, 6000),
    Phone: phone,
    Subject: normalizedText(listing.title, 90),
    category: categoryId,
    id: externalId
      ? assertOlxProviderListingId(externalId)
      : createOlxProviderListingId(listing.listingId),
    images: normalizedOlxImages(listing.mediaUrls),
    operation: "insert",
    ...(Object.keys(params).length ? { params } : {}),
    price: listing.priceCents ? Math.round(listing.priceCents / 100) : 0,
    type: "s",
    ...(zipCode ? { zipcode: zipCode } : {}),
  };

  return {
    attributes: {
      categoryId: String(categoryId),
      parameterIds: Object.keys(params),
    },
    body,
    mediaUrls: listing.mediaUrls,
    title: listing.title,
  };
}

export function createOlxProviderListingId(listingId: string) {
  const digest = createHash("sha256").update(listingId).digest("hex");
  return `lv_${digest.slice(0, 16)}`;
}

export function assertOlxProviderListingId(value: string) {
  if (!/^[A-Za-z0-9_{}-]{1,19}$/.test(value)) {
    throw new Error("Invalid OLX provider listing id.");
  }
  return value;
}

function normalizedOlxImages(values: readonly string[]) {
  return [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ].slice(0, 20);
}

function normalizedText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function olxCategory(value: MarketplaceListingProjection["vehicleType"]) {
  if (value === "motorcycles") return 2060;
  if (value === "trucks") return 2040;
  return 2020;
}

function olxFuelType(value: MarketplaceListingProjection["fuelType"]) {
  if (!value) return null;
  const labels = {
    diesel: "5",
    electric: "7",
    ethanol: "2",
    flex: "3",
    gasoline: "1",
    hybrid: "6",
    other: null,
  } satisfies Record<NonNullable<typeof value>, string | null>;
  return labels[value];
}

function olxDoors(value: number | null) {
  if (value === null) return null;
  if (value <= 2) return "1";
  if (value === 3) return "3";
  return "2";
}

function olxPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const withoutCountryCode =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return /^\d{10,11}$/.test(withoutCountryCode)
    ? Number(withoutCountryCode)
    : null;
}

function olxPlate(value: string | null) {
  const plate = value?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() ?? "";
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)
    ? plate
    : null;
}

function olxZipCode(value: string | null) {
  const zipCode = value?.replace(/\D/g, "") ?? "";
  return /^\d{8}$/.test(zipCode) ? zipCode : null;
}

function stringSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function marketplaceFuelType(value: MarketplaceListingProjection["fuelType"]) {
  if (!value) return null;
  const labels = {
    diesel: "Diesel",
    electric: "Eletrico",
    ethanol: "Etanol",
    flex: "Flex",
    gasoline: "Gasolina",
    hybrid: "Hibrido",
    other: "Outro",
  } satisfies Record<NonNullable<typeof value>, string>;
  return labels[value];
}

function marketplaceVehicleType(
  value: MarketplaceListingProjection["vehicleType"],
) {
  if (!value) return null;
  const labels = {
    cars: "Carro",
    motorcycles: "Moto",
    trucks: "Caminhao",
  } satisfies Record<NonNullable<typeof value>, string>;
  return labels[value];
}

function stringValue(value: number | null | undefined) {
  return typeof value === "number" ? String(value) : null;
}
