import { createMemoryAuditSink } from "../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../shared/serviceContext.js";
import type {
  MarketplaceCatalogMapping,
  MarketplaceListingProjection,
  MarketplaceProviderListing,
} from "./ports/marketplaceRepository.js";

export function readyListing(
  overrides: Partial<MarketplaceListingProjection> = {},
): MarketplaceListingProjection {
  return {
    catalog: {
      brandCode: "21",
      brandName: "BMW",
      fipeCode: "001267-0",
      fuel: "Gasolina",
      modelCode: "4828",
      modelName: "M3 Competition M",
      modelYear: 2024,
      referenceMonth: "julho de 2026",
      source: "fipe",
      vehicleType: "cars",
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    },
    condition: "used",
    contactPhone: "5511999999999",
    description: "BMW M3 Competition M.",
    doors: 4,
    fuelType: "gasoline",
    isVisibleOnPublicSite: true,
    licensePlate: "ABC1D23",
    listingId: "listing_1",
    locationZipCode: "01310-100",
    mediaUrls: ["https://cdn.local/m3-front.jpg"],
    mileageKm: 12000,
    modelYear: 2024,
    priceCents: 75990000,
    publicSlug: "bmw-m3-competition-m-2024",
    selectedMedia: [
      { altText: "BMW M3 dianteira", url: "https://cdn.local/m3-front.jpg" },
    ],
    selectedUnitId: "unit_1",
    status: "published",
    stockLabel: "M3-001",
    title: "BMW M3 Competition M 2024",
    trimName: "Competition M",
    vehicleType: "cars",
    ...overrides,
  };
}

export function providerListing(): MarketplaceProviderListing {
  return {
    accountId: "account_1",
    externalId: "external_1",
    listingId: "listing_1",
    metadata: {},
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}

export function resolvedMapping(): MarketplaceCatalogMapping {
  return {
    fipeBrandCode: "21",
    fipeCode: "001267-0",
    fipeModelCode: "4828",
    fipeYearCode: "2024-1",
    provider: "mercado_livre",
    providerBrandCode: "BMW",
    providerModelCode: "M3",
    providerTrimCode: "COMPETITION_M",
    providerYearCode: "2024",
    status: "resolved",
    unresolvedReason: null,
    vehicleType: "cars",
  };
}

export function tokenSet() {
  return {
    accessToken: "token_1",
    expiresAt: null,
    providerAccountId: "seller_1",
    refreshToken: null,
    scope: "autoupload",
    tokenType: "Bearer",
  };
}

export function marketplaceContext() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: createMemoryAuditSink(),
      logger: createNoopServiceLogger(),
      permissions: ["marketplace.inventory_sync"],
      request: { requestId: "req_marketplace_preview" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["marketplace"] },
  );
}
