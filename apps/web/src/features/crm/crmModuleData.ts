import type { InventoryListingSummary } from "../inventory/model/types";
import type { ProductCrmApi, ProductCrmLeadQuery } from "./productCrmApi";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";
import type {
  LeadActivitiesById,
  LeadVehicleOption,
} from "./CrmPipelineViewTypes";

export async function loadActivitiesByLeadId(
  crmApi: ProductCrmApi,
  leads: ProductCrmLead[],
): Promise<LeadActivitiesById> {
  const entries: Array<[string, ProductCrmLeadActivity[]]> = await Promise.all(
    leads.map(async (lead) => [lead.id, await crmApi.listActivities(lead.id)]),
  );

  return Object.fromEntries(entries) as LeadActivitiesById;
}

export async function listAllMatchingLeads(
  crmApi: ProductCrmApi,
  query: ProductCrmLeadQuery,
): Promise<ProductCrmLead[]> {
  const pageSize = query.limit ?? 100;
  const leads: ProductCrmLead[] = [];
  let offset = query.offset ?? 0;

  for (;;) {
    const page = await crmApi.listLeads({ ...query, limit: pageSize, offset });
    leads.push(...page);
    if (page.length < pageSize) return leads;
    offset += pageSize;
  }
}

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
