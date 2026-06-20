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
  const body = {
    attributes: [
      ...(listing.modelYear
        ? [{ id: "VEHICLE_YEAR", value_name: String(listing.modelYear) }]
        : []),
    ],
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
    attributes: { categoryId, currencyId },
    body,
    mediaUrls: listing.mediaUrls,
    title: listing.title,
  };
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
