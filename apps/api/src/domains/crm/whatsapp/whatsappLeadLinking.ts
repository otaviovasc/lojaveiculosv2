import type { CrmLead, CrmRepository } from "../ports/crmRepository.js";
import { shouldBackfillWhatsappPhone } from "./whatsappContactIdentity.js";
import {
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export type FindOrCreateWhatsappLeadInput = {
  buyerName?: string | null;
  buyerPhone: string;
  connectionId: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId: string;
  preferredLeadId?: string | null;
  storeId: CrmLead["storeId"];
  tenantId: CrmLead["tenantId"];
};

export async function findOrCreateWhatsappLead(
  ports: CrmServicePorts,
  input: FindOrCreateWhatsappLeadInput,
) {
  const repository = getCrmRepository(ports);
  const preferred = input.preferredLeadId
    ? await repository.findLeadById({
        leadId: input.preferredLeadId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
    : null;
  if (preferred) {
    return enrichExistingWhatsappLead(repository, preferred, input);
  }
  const existing = await repository.findLeadByPhone({
    buyerPhone: input.buyerPhone,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (existing) return enrichExistingWhatsappLead(repository, existing, input);

  return repository.createLead({
    ...(input.buyerName?.trim() ? { buyerName: input.buyerName.trim() } : {}),
    buyerPhone: input.buyerPhone,
    metadata: createWhatsappLeadMetadata(input),
    source: "whatsapp",
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

async function enrichExistingWhatsappLead(
  repository: CrmRepository,
  lead: CrmLead,
  input: FindOrCreateWhatsappLeadInput,
) {
  const buyerName = readEnrichedBuyerName(lead, input.buyerName);
  const buyerPhone = shouldBackfillWhatsappPhone(
    lead.buyerPhone,
    input.buyerPhone,
    true,
  )
    ? input.buyerPhone
    : undefined;
  const metadata = readEnrichedMetadata(lead.metadata, input);
  if (
    buyerName === undefined &&
    buyerPhone === undefined &&
    metadata === undefined
  ) {
    return lead;
  }

  return repository.updateLead({
    ...(buyerName !== undefined ? { buyerName } : {}),
    ...(buyerPhone !== undefined ? { buyerPhone } : {}),
    leadId: lead.id,
    ...(metadata !== undefined ? { metadata } : {}),
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
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
