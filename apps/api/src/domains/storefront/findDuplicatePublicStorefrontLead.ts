import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  PublicStorefrontLead,
  PublicStorefrontLeadSink,
} from "./ports/publicStorefrontLeadSink.js";

type DuplicatePublicStorefrontLeadInput = {
  buyerEmail: string | null;
  buyerPhone: string | null;
  listingId: string | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export async function findDuplicatePublicStorefrontLead(
  repository: PublicStorefrontLeadSink,
  input: DuplicatePublicStorefrontLeadInput,
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
  input: Pick<DuplicatePublicStorefrontLeadInput, "buyerEmail" | "buyerPhone">,
) {
  return Boolean(
    (input.buyerEmail && lead.buyerEmail === input.buyerEmail) ||
    (input.buyerPhone && lead.buyerPhone === input.buyerPhone),
  );
}
