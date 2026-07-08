import { and, eq } from "drizzle-orm";
import { marketplaceCatalogMappings } from "@lojaveiculosv2/db";
import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

export async function findCatalogMapping(
  db: DrizzleMarketplaceClient,
  input: { catalog: MarketplaceCatalogSnapshot; provider: MarketplaceProvider },
): Promise<MarketplaceCatalogMapping | null> {
  const catalog = input.catalog;
  if (
    !catalog.brandCode ||
    !catalog.fipeCode ||
    !catalog.modelCode ||
    !catalog.vehicleType ||
    !catalog.yearCode
  ) {
    return null;
  }
  const [row] = await db
    .select()
    .from(marketplaceCatalogMappings)
    .where(
      and(
        eq(marketplaceCatalogMappings.provider, input.provider),
        eq(marketplaceCatalogMappings.vehicleType, catalog.vehicleType),
        eq(marketplaceCatalogMappings.fipeBrandCode, catalog.brandCode),
        eq(marketplaceCatalogMappings.fipeModelCode, catalog.modelCode),
        eq(marketplaceCatalogMappings.fipeCode, catalog.fipeCode),
        eq(marketplaceCatalogMappings.fipeYearCode, catalog.yearCode),
      ),
    )
    .limit(1);
  return row
    ? {
        fipeBrandCode: row.fipeBrandCode,
        fipeCode: row.fipeCode,
        fipeModelCode: row.fipeModelCode,
        fipeYearCode: row.fipeYearCode,
        provider: row.provider as MarketplaceProvider,
        providerBrandCode: row.providerBrandCode,
        providerModelCode: row.providerModelCode,
        providerTrimCode: row.providerTrimCode,
        providerYearCode: row.providerYearCode,
        status: row.status,
        unresolvedReason: row.unresolvedReason,
        vehicleType:
          row.vehicleType as MarketplaceCatalogMapping["vehicleType"],
      }
    : null;
}
