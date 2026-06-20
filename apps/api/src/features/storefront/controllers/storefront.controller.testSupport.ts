import { vi } from "vitest";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";

const store = {
  id: "store_1" as never,
  name: "Loja Demo",
  slug: "demo",
  tenantId: "tenant_1" as never,
};

export const publicStore = {
  name: "Loja Demo",
  slug: "demo",
};

const listing = {
  description: "Ready to sell.",
  id: "listing_1",
  manufactureYear: 2022,
  media: [
    {
      altText: "Front photo",
      displayOrder: 0,
      kind: "photo" as const,
      url: "https://cdn.local/front.jpg",
    },
  ],
  mileageKm: 32000,
  modelYear: 2023,
  priceCents: 12690000,
  slug: "fiat-toro-2023",
  status: "available" as const,
  thumbnailUrl: "https://cdn.local/front.jpg",
  title: "Fiat Toro Volcano 2023",
};

export const { id: _listingId, ...listingResponse } = listing;

export const site = {
  contact: {
    city: "Sao Paulo",
    contactEmail: "contato@demo.com.br",
    contactPhone: null,
    whatsappPhone: "5511999999999",
    whatsappUrl: "https://wa.me/5511999999999",
  },
  site: {
    heroImageUrl: "https://cdn.local/hero.jpg",
    layoutKey: "default",
    seoDescription: "Estoque selecionado",
    seoTitle: "Loja Demo",
    theme: {},
  },
  store: { ...store, publicUrl: "demo.lojaveiculos.com.br" },
};

export function createRepository(
  options: { includeListing?: boolean; includeStore?: boolean } = {},
): PublicStorefrontRepository {
  return {
    findPublicSiteBySlug: vi.fn(async () =>
      options.includeStore === false ? null : site,
    ),
    findPublicListingDetail: vi.fn(async () =>
      options.includeListing === false ? null : listing,
    ),
    findPublicStoreBySlug: vi.fn(async () =>
      options.includeStore === false ? null : store,
    ),
    listPublicListings: vi.fn(async () => [listing]),
  };
}

export function createCrmRepository(): CrmRepository {
  return {
    createActivity: vi.fn(async () => {
      throw new Error("Unexpected activity creation");
    }),
    createLead: vi.fn<CrmRepository["createLead"]>(async (input) => ({
      assignedUserId: input.assignedUserId ?? null,
      buyerEmail: input.buyerEmail ?? null,
      buyerName: input.buyerName ?? null,
      buyerPhone: input.buyerPhone ?? null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "lead_1",
      lastInteractionAt: null,
      listingId: input.listingId ?? null,
      metadata: input.metadata ?? {},
      source: input.source,
      status: "new" as const,
      storeId: input.storeId,
      tenantId: input.tenantId,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      vehicleTitle: null,
    })),
    findLeadById: vi.fn(async () => null),
    listActivities: vi.fn(async () => []),
    listLeads: vi.fn(async () => []),
    updateLead: vi.fn(async () => {
      throw new Error("Unexpected lead update");
    }),
  };
}
