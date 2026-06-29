import type { CrmLead, CrmRepository } from "../crm/ports/crmRepository.js";
import type { PublicStorefrontLeadSink } from "./ports/publicStorefrontLeadSink.js";

export function createPublicStorefrontLeadSink(
  repository: CrmRepository,
): PublicStorefrontLeadSink {
  return {
    createLead: async (input) =>
      toPublicLead(await repository.createLead(input)),
    listLeads: async (input) =>
      (await repository.listLeads(input))
        .filter((lead) => lead.source === "public_site")
        .map(toPublicLead),
  };
}

export const testPublicStorefrontStore = {
  id: "store_1" as never,
  name: "Loja Demo",
  slug: "demo",
  tenantId: "tenant_1" as never,
};

export const testPublicStorefrontListing = {
  condition: "used" as const,
  description: "Ready to sell.",
  doors: 4,
  engineAspiration: "turbo" as const,
  engineDisplacement: "2.0" as const,
  fuelType: "flex",
  id: "listing_1",
  manufactureYear: 2022,
  media: [],
  mediaGroups: [],
  mileageKm: 32000,
  modelYear: 2023,
  priceCents: 12690000,
  slug: "fiat-toro-2023",
  status: "available" as const,
  thumbnailUrl: "https://cdn.local/front.jpg",
  title: "Fiat Toro Volcano 2023",
  transmission: "automatic",
  trimName: "Volcano",
};

function toPublicLead(lead: CrmLead) {
  return {
    buyerEmail: lead.buyerEmail,
    buyerPhone: lead.buyerPhone,
    createdAt: lead.createdAt,
    id: lead.id,
    listingId: lead.listingId,
    source: "public_site" as const,
    status: lead.status,
  };
}
