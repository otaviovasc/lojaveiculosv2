import type { InventoryApi } from "../api/apiClient";
import type { InventoryCatalogSnapshot } from "./catalogTypes";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";

export async function resolvePlateCatalogSnapshot(
  _api: InventoryApi,
  lookup: InventoryPlateLookupResponse,
): Promise<InventoryCatalogSnapshot | null> {
  return lookup.catalogIdentity.status === "resolved"
    ? lookup.catalogIdentity.catalog
    : null;
}
