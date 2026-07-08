import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { MarketplaceSyncJobType } from "../../ports/marketplaceRepository.js";

export function permissionForMarketplaceJob(
  jobType: MarketplaceSyncJobType,
): PermissionKey {
  if (jobType === "inventory_sync") return "marketplace.inventory_sync";
  if (jobType === "lead_sync") return "marketplace.lead_sync";
  if (jobType === "listing_publish") return "marketplace.listing_publish";
  if (jobType === "listing_unpublish") {
    return "marketplace.listing_unpublish";
  }
  return "marketplace.listing_update";
}
