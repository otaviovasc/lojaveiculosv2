import { expect, vi } from "vitest";
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

const listingHeroMedia = {
  altText: "Front photo",
  displayOrder: 0,
  kind: "photo" as const,
  unitColorName: "Preto",
  unitId: "unit_1",
  url: "https://cdn.local/front.jpg",
};

const listing = {
  commercialTags: [],
  condition: "used" as const,
  description: "Ready to sell.",
  doors: 4,
  engineAspiration: "turbo" as const,
  engineDisplacement: "2.0" as const,
  fuelType: "flex",
  heroMedia: listingHeroMedia,
  id: "listing_1",
  manufactureYear: 2022,
  media: [listingHeroMedia],
  mediaGroups: [
    {
      colorName: "Preto",
      media: [listingHeroMedia],
      unitId: "unit_1",
    },
  ],
  mileageKm: 32000,
  modelYear: 2023,
  priceCents: 12690000,
  slug: "fiat-toro-2023",
  status: "available" as const,
  thumbnailUrl: "https://cdn.local/front.jpg",
  title: "Fiat Toro Volcano 2023",
  transmission: "automatic",
  trimName: "Volcano",
  videoUrl: null,
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

export async function expectApiError(
  response: Response,
  input: { code: string; details?: Record<string, unknown>; message: string },
) {
  const body = (await response.json()) as {
    code?: string;
    details?: Record<string, unknown>;
    message?: string;
    requestId?: unknown;
  };

  expect(body).toMatchObject({
    code: input.code,
    ...(input.details ? { details: input.details } : {}),
    message: input.message,
  });
  expect(typeof body.requestId).toBe("string");
}

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
    createActivityIdempotently: vi.fn(async () => {
      throw new Error("Unexpected idempotent activity creation");
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
      pipelineId: null,
      pipelineStageId: null,
      source: input.source,
      status: "new" as const,
      storeId: input.storeId,
      tenantId: input.tenantId,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      vehicleTitle: null,
    })),
    countLeadsByPipeline: vi.fn(async () => 0),
    countLeadsByPipelineStages: vi.fn(async () => 0),
    findLeadById: vi.fn(async () => null),
    findLeadByPhone: vi.fn(async () => null),
    listActivities: vi.fn(async () => []),
    listLeads: vi.fn(async () => []),
    updateLead: vi.fn(async () => {
      throw new Error("Unexpected lead update");
    }),
  };
}
