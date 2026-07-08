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
  listing: MarketplaceListingProjection;
  provider: MarketplaceProvider;
  settings: Record<string, unknown>;
}): ProviderListingPayload {
  if (input.provider === "mercado_livre") {
    return createMercadoLivrePayload(input.listing, input.settings);
  }
  return createOlxPayload(input.listing, input.settings);
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
    condition: "used",
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
): ProviderListingPayload {
  const categoryId = stringSetting(settings, "categoryId") ?? "autos";
  const body = {
    category_id: categoryId,
    description: listing.description ?? listing.title,
    images: listing.mediaUrls,
    price: listing.priceCents ? Math.round(listing.priceCents / 100) : null,
    title: listing.title,
    vehicle_type: listing.vehicleType,
    year: listing.modelYear,
  };

  return {
    attributes: { categoryId },
    body,
    mediaUrls: listing.mediaUrls,
    title: listing.title,
  };
}

function stringSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
