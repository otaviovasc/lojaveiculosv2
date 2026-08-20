import { vi } from "vitest";
import type {
  MarketplaceCatalogSnapshot,
  MarketplaceRepository,
} from "../../domains/marketplace/ports/marketplaceRepository.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

export function ix35Catalog(): MarketplaceCatalogSnapshot {
  return {
    brandCode: "26",
    brandName: "Hyundai",
    fipeCode: "015086-0",
    fuel: "Flex",
    modelCode: "5931",
    modelName: "ix35 GLS 2.0 16V 2WD Flex Aut.",
    modelYear: 2015,
    referenceMonth: "julho de 2026",
    source: "fipe",
    vehicleType: "cars",
    yearCode: "2015-5",
    yearName: "2015 Flex",
  };
}

export function cheryCatalog(): MarketplaceCatalogSnapshot {
  return {
    brandCode: "161",
    brandName: "Caoa Chery/Chery",
    fipeCode: "073025-4",
    fuel: "Flex",
    modelCode: "8587",
    modelName: "Tiggo 7 TXS 1.5 16V Turbo Flex Aut.",
    modelYear: 2022,
    referenceMonth: "agosto de 2026",
    source: "fipe",
    vehicleType: "cars",
    yearCode: "2022-5",
    yearName: "2022 Flex",
  };
}

export function cheryCatalogFetch() {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      jsonResponse({ data: { "CAOA CHERY": 161, CHERY: 162 }, status: "ok" }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ data: { "TIGGO 7": 8587 }, status: "ok" }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { "TXS 1.5 16V TURBO FLEX AUTOMATICO": 1 },
        status: "ok",
      }),
    );
}

export async function resolveCheryCatalog(fetch: typeof globalThis.fetch) {
  const resolver = createOlxTestGateway(fetch).resolveCatalogMapping;
  if (!resolver) throw new Error("Missing OLX catalog resolver");
  return resolver({ catalog: cheryCatalog(), token: tokenSet() });
}

export function ix35CatalogFetch(
  versions: Record<string, number>,
  includeAccountCheck = false,
) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  if (includeAccountCheck) {
    fetch.mockResolvedValueOnce(
      jsonResponse({ user_email: "seller@example.test" }),
    );
  }
  return fetch
    .mockResolvedValueOnce(
      jsonResponse({ data: { HYUNDAI: 28 }, status: "ok" }),
    )
    .mockResolvedValueOnce(jsonResponse({ data: { IX35: 237 }, status: "ok" }))
    .mockResolvedValueOnce(jsonResponse({ data: versions, status: "ok" }));
}

export async function resolveIx35Catalog(
  fetch: typeof globalThis.fetch,
  catalog = ix35Catalog(),
) {
  const resolver = createOlxTestGateway(fetch).resolveCatalogMapping;
  if (!resolver) throw new Error("Missing OLX catalog resolver");
  return resolver({ catalog, token: tokenSet() });
}

export function seedOlxAccount(repository: MarketplaceRepository) {
  return repository.upsertAccount({
    config: {
      connection: { scope: "autoupload" },
      credentials: { accessToken: "token_1" },
    },
    provider: "olx",
    status: "active",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
}
