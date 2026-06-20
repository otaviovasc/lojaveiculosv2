import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontLead,
  PublicStorefrontLeadSink,
} from "../../ports/publicStorefrontLeadSink.js";
import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import {
  getPublicStorefrontRepository,
  PublicStorefrontListingNotFoundError,
  PublicStorefrontNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.lead_create";

export type CreatePublicStorefrontLeadInput = {
  buyerEmail?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  listingSlug: string;
  message?: string | null;
  storeSlug: string;
};

export type PublicStorefrontLeadPorts = {
  leadSink: PublicStorefrontLeadSink;
  storefrontRepository: PublicStorefrontRepository;
};

export type PublicStorefrontLeadResult = {
  deduplicated: boolean;
  lead: Pick<PublicStorefrontLead, "id" | "source" | "status">;
};

export async function createPublicStorefrontLead(
  context: ServiceContext,
  input: CreatePublicStorefrontLeadInput,
  ports: PublicStorefrontLeadPorts,
): Promise<PublicStorefrontLeadResult> {
  assertPermission(context, permission);
  const storefrontRepository = getPublicStorefrontRepository(
    ports.storefrontRepository,
  );

  context.logger.info(
    "public_storefront.lead.create.started",
    createServiceLogMetadata(context, {
      listingSlug: input.listingSlug,
      storeSlug: input.storeSlug,
    }),
  );

  const store = await storefrontRepository.findPublicStoreBySlug(
    input.storeSlug,
  );

  if (!store) throw new PublicStorefrontNotFoundError(input.storeSlug);

  const listing = await storefrontRepository.findPublicListingDetail({
    listingSlug: input.listingSlug,
    storeId: store.id,
    tenantId: store.tenantId,
  });

  if (!listing) {
    throw new PublicStorefrontListingNotFoundError(input.listingSlug);
  }

  const duplicate = await findDuplicatePublicLead(ports.leadSink, {
    buyerEmail: input.buyerEmail ?? null,
    buyerPhone: input.buyerPhone ?? null,
    listingId: listing.id,
    storeId: store.id,
    tenantId: store.tenantId,
  });
  if (duplicate) {
    await recordLeadAudit(context, {
      action: "public_storefront.lead.duplicate_suppressed",
      hasMessage: Boolean(input.message),
      lead: duplicate,
      listing,
      store,
      summary: "Suppressed duplicate public storefront CRM lead",
    });
    return {
      deduplicated: true,
      lead: {
        id: duplicate.id,
        source: duplicate.source,
        status: duplicate.status,
      },
    };
  }

  const lead = await ports.leadSink.createLead({
    buyerEmail: input.buyerEmail ?? null,
    buyerName: input.buyerName,
    buyerPhone: input.buyerPhone ?? null,
    listingId: listing.id,
    metadata: {
      listingId: listing.id,
      listingSlug: listing.slug,
      listingTitle: listing.title,
      message: input.message ?? null,
      sourceChannel: "storefront",
      storeSlug: store.slug,
    },
    source: "public_site",
    storeId: store.id,
    tenantId: store.tenantId,
  });

  await recordLeadAudit(context, {
    action: "public_storefront.lead.create",
    hasMessage: Boolean(input.message),
    lead,
    listing,
    store,
    summary: "Created public storefront CRM lead",
  });

  return {
    deduplicated: false,
    lead: { id: lead.id, source: lead.source, status: lead.status },
  };
}

async function findDuplicatePublicLead(
  repository: PublicStorefrontLeadSink,
  input: {
    buyerEmail: string | null;
    buyerPhone: string | null;
    listingId: string;
    storeId: StoreId;
    tenantId: TenantId;
  },
): Promise<PublicStorefrontLead | null> {
  const search = input.buyerEmail ?? input.buyerPhone;
  if (!search) return null;
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const leads = await repository.listLeads({
    limit: 20,
    search,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });

  return (
    leads.find(
      (lead) =>
        lead.source === "public_site" &&
        lead.listingId === input.listingId &&
        lead.createdAt.getTime() >= recentCutoff &&
        sameContact(lead, input),
    ) ?? null
  );
}

function sameContact(
  lead: Pick<PublicStorefrontLead, "buyerEmail" | "buyerPhone">,
  input: { buyerEmail: string | null; buyerPhone: string | null },
) {
  return Boolean(
    (input.buyerEmail && lead.buyerEmail === input.buyerEmail) ||
    (input.buyerPhone && lead.buyerPhone === input.buyerPhone),
  );
}

async function recordLeadAudit(
  context: ServiceContext,
  input: {
    action: string;
    hasMessage: boolean;
    lead: Pick<
      PublicStorefrontLead,
      "buyerEmail" | "buyerPhone" | "id" | "source" | "status"
    >;
    listing: { id: string; slug: string; title: string };
    store: { id: string; slug: string; tenantId: string };
    summary: string;
  },
) {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: "data_change",
    entityId: input.lead.id,
    entityType: "lead",
    metadata: {
      hasBuyerEmail: Boolean(input.lead.buyerEmail),
      hasBuyerPhone: Boolean(input.lead.buyerPhone),
      hasMessage: input.hasMessage,
      listingId: input.listing.id,
      listingSlug: input.listing.slug,
      listingTitle: input.listing.title,
      permission,
      source: input.lead.source,
      sourceChannel: "storefront",
      status: input.lead.status,
      storeSlug: input.store.slug,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: input.store.id,
    tenantId: input.store.tenantId,
    summary: input.summary,
  });
}
