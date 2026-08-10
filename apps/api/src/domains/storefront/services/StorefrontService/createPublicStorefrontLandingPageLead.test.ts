import { describe, expect, it, vi } from "vitest";
import type { PublicStorefrontLeadSink } from "../../ports/publicStorefrontLeadSink.js";
import {
  testPublicStorefrontListing,
  testPublicStorefrontStore,
} from "../../testSupportPublicStorefrontLead.js";
import { createPublicStorefrontLead } from "./createPublicStorefrontLead.js";

describe("createPublicStorefrontLead landing page", () => {
  it("creates a store-scoped lead without inventing a listing", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const leadSink = createLeadSink();
    const storefrontRepository = createRepository();

    const result = await createPublicStorefrontLead(
      createPublicContext(audit),
      {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        message: "Quero conhecer o estoque.",
        storeSlug: "demo",
      },
      { leadSink, storefrontRepository },
    );

    expect(result.deduplicated).toBe(false);
    expect(storefrontRepository.findPublicListingDetail).not.toHaveBeenCalled();
    const [createdLead] = vi.mocked(leadSink.createLead).mock.calls[0] ?? [];
    expect(createdLead).toEqual(
      expect.objectContaining({
        listingId: null,
      }),
    );
    expect(createdLead?.metadata).toEqual(
      expect.objectContaining({
        sourceChannel: "storefront",
        sourceSurface: "landing_page",
        storeSlug: "demo",
      }),
    );
    const [recordedAudit] = (vi.mocked(audit.record).mock.calls[0] ??
      []) as unknown as [{ metadata: Record<string, unknown> }];
    expect(recordedAudit.metadata).toEqual(
      expect.objectContaining({
        listingId: null,
        sourceSurface: "landing_page",
      }),
    );
  });

  it("deduplicates a recent lead with the same contact and no listing", async () => {
    const leadSink = createLeadSink([
      {
        buyerEmail: null,
        buyerPhone: "11999999999",
        createdAt: new Date(),
        id: "lead_existing",
        listingId: null,
        source: "public_site",
        status: "new",
      },
    ]);

    const result = await createPublicStorefrontLead(
      createPublicContext(),
      {
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        storeSlug: "demo",
      },
      { leadSink, storefrontRepository: createRepository() },
    );

    expect(result).toEqual({
      deduplicated: true,
      lead: { id: "lead_existing", source: "public_site", status: "new" },
    });
    expect(leadSink.createLead).not.toHaveBeenCalled();
  });
});

function createRepository() {
  return {
    findPublicListingDetail: vi.fn(async () => testPublicStorefrontListing),
    findPublicSiteBySlug: vi.fn(async () => null),
    findPublicStoreBySlug: vi.fn(async () => testPublicStorefrontStore),
    listPublicListings: vi.fn(async () => [testPublicStorefrontListing]),
  };
}

function createLeadSink(
  existing: Awaited<ReturnType<PublicStorefrontLeadSink["listLeads"]>> = [],
): PublicStorefrontLeadSink {
  return {
    createLead: vi.fn<PublicStorefrontLeadSink["createLead"]>(
      async (input) => ({
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        createdAt: new Date(),
        id: "lead_1",
        listingId: input.listingId,
        source: "public_site" as const,
        status: "new",
      }),
    ),
    listLeads: vi.fn(async () => existing),
  };
}

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
