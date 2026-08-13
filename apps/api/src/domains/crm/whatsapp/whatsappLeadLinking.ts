import type {
  CrmLead,
  CrmRepository,
  LeadSource,
} from "../ports/crmRepository.js";
import { shouldBackfillWhatsappPhone } from "./whatsappContactIdentity.js";
import {
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { ensureLeadPipeline } from "../pipeline/ensureLeadPipeline.js";

export type FindOrCreateWhatsappLeadInput = {
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  connectionId: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId: string;
  preferredLeadId?: string | null;
  source?: LeadSource;
  storeId: CrmLead["storeId"];
  tenantId: CrmLead["tenantId"];
};

export async function findOrCreateWhatsappLead(
  ports: CrmServicePorts,
  input: FindOrCreateWhatsappLeadInput,
) {
  const repository = getCrmRepository(ports);
  const placement = await ensureLeadPipeline(ports, {
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const preferred = input.preferredLeadId
    ? await repository.findLeadById({
        leadId: input.preferredLeadId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
    : null;
  if (preferred && isActiveLead(preferred)) {
    return enrichExistingWhatsappLead(repository, preferred, input, placement);
  }
  const existing = input.buyerPhone
    ? await repository.findLeadByPhone({
        buyerPhone: input.buyerPhone,
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
    : null;
  if (existing) {
    return enrichExistingWhatsappLead(repository, existing, input, placement);
  }

  return repository.createLead({
    ...(input.buyerEmail?.trim()
      ? { buyerEmail: input.buyerEmail.trim() }
      : {}),
    ...(input.buyerName?.trim() ? { buyerName: input.buyerName.trim() } : {}),
    ...(input.buyerPhone ? { buyerPhone: input.buyerPhone } : {}),
    metadata: createWhatsappLeadMetadata(input),
    ...placement,
    source: input.source ?? "whatsapp",
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

function isActiveLead(lead: CrmLead) {
  return (
    lead.status !== "won" &&
    lead.status !== "lost" &&
    lead.status !== "archived"
  );
}

async function enrichExistingWhatsappLead(
  repository: CrmRepository,
  lead: CrmLead,
  input: FindOrCreateWhatsappLeadInput,
  placement: Pick<CrmLead, "pipelineId" | "pipelineStageId">,
) {
  const buyerName = readEnrichedBuyerName(lead, input.buyerName);
  const buyerEmail = readEnrichedBuyerEmail(lead, input.buyerEmail);
  const buyerPhone =
    input.buyerPhone &&
    shouldBackfillWhatsappPhone(lead.buyerPhone, input.buyerPhone, true)
      ? input.buyerPhone
      : undefined;
  const metadata = readEnrichedMetadata(lead.metadata, input);
  if (
    buyerEmail === undefined &&
    buyerName === undefined &&
    buyerPhone === undefined &&
    metadata === undefined &&
    lead.pipelineId !== null &&
    lead.pipelineStageId !== null
  ) {
    return lead;
  }

  return repository.updateLead({
    ...(buyerEmail !== undefined ? { buyerEmail } : {}),
    ...(buyerName !== undefined ? { buyerName } : {}),
    ...(buyerPhone !== undefined ? { buyerPhone } : {}),
    leadId: lead.id,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(!lead.pipelineId || !lead.pipelineStageId ? placement : {}),
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

function readEnrichedBuyerEmail(lead: CrmLead, buyerEmail?: string | null) {
  const normalized = buyerEmail?.trim();
  if (!normalized || lead.buyerEmail?.trim()) return undefined;
  return normalized;
}

function readEnrichedBuyerName(lead: CrmLead, buyerName?: string | null) {
  const normalized = buyerName?.trim();
  if (!normalized || lead.buyerName?.trim()) return undefined;
  return normalized;
}

function readEnrichedMetadata(
  metadata: Record<string, unknown>,
  input: FindOrCreateWhatsappLeadInput,
) {
  const currentWhatsapp = readRecord(metadata.crmWhatsapp);
  if (typeof currentWhatsapp.firstMessageExternalId === "string") {
    return undefined;
  }
  return {
    ...metadata,
    crmWhatsapp: {
      ...currentWhatsapp,
      ...createWhatsappLeadMetadata(input).crmWhatsapp,
    },
  };
}

function createWhatsappLeadMetadata(input: FindOrCreateWhatsappLeadInput) {
  return {
    crmWhatsapp: {
      firstConnectionId: input.connectionId,
      firstDirection: input.direction,
      firstMessageExternalId: input.externalId,
    },
  };
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
