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

export const MOCK_FALLBACK_VEHICLES: LeadVehicleOption[] = [
  {
    id: "mock-v1",
    label: "Ford Ranger",
    detail: "Preta - Diesel",
    imageUrl:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=200",
    priceCents: 41000000,
    manufactureYear: 2023,
    modelYear: 2024,
  },
  {
    id: "mock-v2",
    label: "Honda Civic 2024",
    detail: "Híbrido - Touring",
    imageUrl:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=200",
    priceCents: 26500000,
    manufactureYear: 2024,
    modelYear: 2024,
  },
  {
    id: "mock-v3",
    label: "Toyota Corolla 2023",
    detail: "Branco - Altis Hybrid",
    imageUrl:
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=200",
    priceCents: 18200000,
    manufactureYear: 2023,
    modelYear: 2023,
  },
  {
    id: "mock-v4",
    label: "Chevrolet Onix 2024",
    detail: "Cinza - LTZ Turbo",
    imageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=200",
    priceCents: 9800000,
    manufactureYear: 2024,
    modelYear: 2024,
  },
];
