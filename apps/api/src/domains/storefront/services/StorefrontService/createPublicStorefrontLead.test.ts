import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import type {
  CrmLead,
  CrmRepository,
} from "../../../crm/ports/crmRepository.js";
import {
  createPublicStorefrontLeadSink,
  testPublicStorefrontListing as listing,
  testPublicStorefrontStore as store,
} from "../../testSupportPublicStorefrontLead.js";
import { createPublicStorefrontLead } from "./createPublicStorefrontLead.js";
import { PublicStorefrontListingNotFoundError } from "./serviceSupport.js";

describe("createPublicStorefrontLead", () => {
  it("creates a public_site CRM lead scoped to the storefront store", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const crmRepository = createCrmRepository();
    const storefrontRepository = createRepository();

    const result = await createPublicStorefrontLead(
      createPublicContext(audit),
      {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        listingSlug: "fiat-toro-2023",
        message: "Tenho interesse.",
        storeSlug: "demo",
      },
      {
        leadSink: createPublicStorefrontLeadSink(crmRepository),
        storefrontRepository,
      },
    );

    expect(result.lead).toEqual({
      id: "lead_1",
      source: "public_site",
      status: "new" as const,
    });
    expect(result.deduplicated).toBe(false);
    expect(crmRepository.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        listingId: "listing_1",
        source: "public_site",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    const [leadInput] = vi.mocked(crmRepository.createLead).mock.calls[0] ?? [];
    expect(leadInput?.metadata).toEqual(
      expect.objectContaining({
        listingId: "listing_1",
        listingSlug: "fiat-toro-2023",
        listingTitle: "Fiat Toro Volcano 2023",
        sourceChannel: "storefront",
        storeSlug: "demo",
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.lead.create",
        entityId: "lead_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });

  it("returns recent matching public lead instead of creating a duplicate", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const crmRepository = createCrmRepository();
    const existingLead = await crmRepository.createLead({
      buyerEmail: "ana@example.com",
      buyerName: "Ana Cliente",
      listingId: "listing_1",
      source: "public_site",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    vi.mocked(crmRepository.createLead).mockClear();
    const result = await createPublicStorefrontLead(
      createPublicContext(audit),
      {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        listingSlug: "fiat-toro-2023",
        storeSlug: "demo",
      },
      {
        leadSink: createPublicStorefrontLeadSink(crmRepository),
        storefrontRepository: createRepository(),
      },
    );
    expect(result).toEqual({
      deduplicated: true,
      lead: {
        id: existingLead.id,
        source: "public_site",
        status: "new",
      },
    });
    expect(crmRepository.createLead).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.lead.duplicate_suppressed",
        entityId: existingLead.id,
      }),
    );
  });

  it("requires public lead create permission", async () => {
    const context = createPublicContext();
    context.permissions = ["public", "public_storefront.read"];

    await expect(
      createPublicStorefrontLead(
        context,
        {
          buyerName: "Ana Cliente",
          listingSlug: "fiat-toro-2023",
          storeSlug: "demo",
        },
        {
          leadSink: createPublicStorefrontLeadSink(createCrmRepository()),
          storefrontRepository: createRepository(),
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("does not create CRM lead when listing is not public", async () => {
    const crmRepository = createCrmRepository();

    await expect(
      createPublicStorefrontLead(
        createPublicContext(),
        {
          buyerName: "Ana Cliente",
          listingSlug: "missing",
          storeSlug: "demo",
        },
        {
          leadSink: createPublicStorefrontLeadSink(crmRepository),
          storefrontRepository: createRepository({ includeListing: false }),
        },
      ),
    ).rejects.toBeInstanceOf(PublicStorefrontListingNotFoundError);
    expect(crmRepository.createLead).not.toHaveBeenCalled();
  });
});

function createPublicContext(audit = { record: vi.fn(async () => undefined) }) {
  return {
    actor: { id: "public", kind: "public" as const },
    audit,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    permissions: [
      "public",
      "public_storefront.lead_create",
      "public_storefront.read",
    ],
    requestId: "req_1",
    storeId: null,
    tenantId: null,
  };
}

function createRepository(options: { includeListing?: boolean } = {}) {
  return {
    findPublicListingDetail: vi.fn(async () =>
      options.includeListing === false ? null : listing,
    ),
    findPublicSiteBySlug: vi.fn(async () => null),
    findPublicStoreBySlug: vi.fn(async () => store),
    listPublicListings: vi.fn(async () => [listing]),
  };
}

function createCrmRepository(): CrmRepository {
  const leads: CrmLead[] = [];
  return {
    createActivity: vi.fn(async () => unexpected("activity creation")),
    createActivityIdempotently: vi.fn(async () =>
      unexpected("idempotent activity creation"),
    ),
    createLead: vi.fn<CrmRepository["createLead"]>(async (input) => {
      const now = new Date();
      const lead: CrmLead = {
        assignedUserId: input.assignedUserId ?? null,
        buyerEmail: input.buyerEmail ?? null,
        buyerName: input.buyerName ?? null,
        buyerPhone: input.buyerPhone ?? null,
        createdAt: now,
        id: `lead_${leads.length + 1}`,
        lastInteractionAt: null,
        listingId: input.listingId ?? null,
        metadata: input.metadata ?? {},
        pipelineId: null,
        pipelineStageId: null,
        source: input.source,
        status: "new" as const,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
        vehicleTitle: null,
      };
      leads.push(lead);
      return lead;
    }),
    countLeadsByPipeline: vi.fn(async () => 0),
    countLeadsByPipelineStages: vi.fn(async () => 0),
    findLeadById: vi.fn(async () => null),
    findLeadByPhone: vi.fn(async () => null),
    listActivities: vi.fn(async () => []),
    listLeads: vi.fn<CrmRepository["listLeads"]>(async (input) =>
      leads
        .filter((lead) => lead.storeId === input.storeId)
        .filter((lead) => lead.tenantId === input.tenantId)
        .filter((lead) =>
          input.search
            ? [lead.buyerEmail, lead.buyerPhone, lead.buyerName].some((value) =>
                value?.includes(input.search ?? ""),
              )
            : true,
        )
        .slice(0, input.limit),
    ),
    updateLead: vi.fn(async () => unexpected("lead update")),
  };
}

function unexpected(operation: string): never {
  throw new Error(`Unexpected ${operation}`);
}
