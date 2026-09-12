import type { InventoryListingSummary } from "../inventory/model/types";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";

export function createLeadVehicleOption(
  item: InventoryListingSummary,
): LeadVehicleOption {
  return {
    detail:
      item.primaryUnit?.plate ?? item.listing.plate ?? item.listing.status,
    id: item.listing.id,
    label: item.listing.title,
    imageUrl: item.primaryMediaUrl,
    priceCents: item.listing.priceCents,
    manufactureYear: item.listing.manufactureYear,
    modelYear: item.listing.modelYear,
  };
}
