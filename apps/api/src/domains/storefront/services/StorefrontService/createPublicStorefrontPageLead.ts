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
import type {
  PublicStorefrontCustomPageSnapshot,
  StorefrontPageRepository,
} from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  StorefrontPageNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.lead_create";

export type CreatePublicStorefrontPageLeadInput = {
  buyerEmail?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  message?: string | null;
  pageSlug: string;
  storeSlug: string;
};

export type PublicStorefrontPageLeadPorts = {
  leadSink: PublicStorefrontLeadSink;
  pageRepository: StorefrontPageRepository;
};

export type PublicStorefrontPageLeadResult = {
  deduplicated: boolean;
  lead: Pick<PublicStorefrontLead, "id" | "source" | "status">;
};

export async function createPublicStorefrontPageLead(
  context: ServiceContext,
  input: CreatePublicStorefrontPageLeadInput,
  ports: PublicStorefrontPageLeadPorts,
): Promise<PublicStorefrontPageLeadResult> {
  assertPermission(context, permission);
  const pageRepository = getStorefrontPageRepository(ports.pageRepository);

  context.logger.info(
    "public_storefront.page_lead.create.started",
    createServiceLogMetadata(context, {
      pageSlug: input.pageSlug,
      storeSlug: input.storeSlug,
    }),
  );

  const snapshot = await pageRepository.findPublicCustomPageBySlug({
    pageSlug: input.pageSlug,
    storeSlug: input.storeSlug,
  });
  if (!snapshot || !canSubmitLead(snapshot)) {
    throw new StorefrontPageNotFoundError(input.pageSlug);
  }

  const duplicate = await findDuplicatePublicPageLead(ports.leadSink, {
    buyerEmail: input.buyerEmail ?? null,
    buyerPhone: input.buyerPhone ?? null,
    storeId: snapshot.store.id,
    tenantId: snapshot.store.tenantId,
  });
  if (duplicate) {
    await recordPageLeadAudit(context, {
      action: "public_storefront.page_lead.duplicate_suppressed",
      hasMessage: Boolean(input.message),
      lead: duplicate,
      snapshot,
      summary: "Suppressed duplicate public storefront page CRM lead",
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
    listingId: null,
    metadata: {
      message: input.message ?? null,
      pageId: snapshot.page.id,
      pageSlug: snapshot.page.slug,
      pageTitle: snapshot.page.title,
      sourceChannel: "custom_page",
      storeSlug: snapshot.store.slug,
    },
    source: "public_site",
    storeId: snapshot.store.id,
    tenantId: snapshot.store.tenantId,
  });

  await recordPageLeadAudit(context, {
    action: "public_storefront.page_lead.create",
    hasMessage: Boolean(input.message),
    lead,
    snapshot,
    summary: "Created public storefront page CRM lead",
  });

  return {
    deduplicated: false,
    lead: { id: lead.id, source: lead.source, status: lead.status },
  };
}

async function findDuplicatePublicPageLead(
  repository: PublicStorefrontLeadSink,
  input: {
    buyerEmail: string | null;
    buyerPhone: string | null;
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
        lead.listingId === null &&
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

function canSubmitLead(snapshot: PublicStorefrontCustomPageSnapshot) {
  return snapshot.sitePublished && snapshot.page.visible;
}

async function recordPageLeadAudit(
  context: ServiceContext,
  input: {
    action: string;
    hasMessage: boolean;
    lead: Pick<
      PublicStorefrontLead,
      "buyerEmail" | "buyerPhone" | "id" | "source" | "status"
    >;
    snapshot: PublicStorefrontCustomPageSnapshot;
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
      pageId: input.snapshot.page.id,
      pageSlug: input.snapshot.page.slug,
      permission,
      source: input.lead.source,
      sourceChannel: "custom_page",
      status: input.lead.status,
      storeSlug: input.snapshot.store.slug,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: input.snapshot.store.id,
    tenantId: input.snapshot.store.tenantId,
    summary: input.summary,
  });
}
