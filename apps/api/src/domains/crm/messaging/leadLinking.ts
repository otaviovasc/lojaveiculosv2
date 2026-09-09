import type {
  CrmLead,
  CrmRepository,
  LeadSource,
} from "../ports/crmRepository.js";
import type { CrmMessagingChannel } from "../ports/crmConversationRepository.js";
import { shouldBackfillCrmMessagingPhone } from "./contactIdentity.js";
import {
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { ensureLeadPipeline } from "../pipeline/ensureLeadPipeline.js";

export type FindOrCreateCrmMessagingLeadInput = {
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  channel: CrmMessagingChannel;
  connectionId: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId: string;
  preferredLeadId?: string | null;
  source: LeadSource;
  storeId: CrmLead["storeId"];
  tenantId: CrmLead["tenantId"];
};

export async function findOrCreateCrmMessagingLead(
  ports: CrmServicePorts,
  input: FindOrCreateCrmMessagingLeadInput,
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
  // Messaging continuity: the conversation's lead is reused even after a
  // terminal outcome so the thread never forks into a parallel listing.
  if (preferred) {
    return enrichExistingCrmMessagingLead(
      repository,
      await reopenTerminalMessagingLead(
        repository,
        preferred,
        input,
        placement,
      ),
      input,
      placement,
    );
  }
  const existing = input.buyerPhone
    ? await repository.findLeadByPhone({
        buyerPhone: input.buyerPhone,
        // Inbound re-engagement keeps lead continuity; staff-initiated
        // outbound to a closed lead starts a fresh opportunity.
        includeTerminal: input.direction === "INBOUND",
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
    : null;
  if (existing) {
    return enrichExistingCrmMessagingLead(
      repository,
      await reopenTerminalMessagingLead(repository, existing, input, placement),
      input,
      placement,
    );
  }

  return repository.createLead({
    ...(input.buyerEmail?.trim()
      ? { buyerEmail: input.buyerEmail.trim() }
      : {}),
    ...(input.buyerName?.trim() ? { buyerName: input.buyerName.trim() } : {}),
    ...(input.buyerPhone ? { buyerPhone: input.buyerPhone } : {}),
    metadata: createCrmMessagingLeadMetadata(input),
    ...placement,
    source: input.source,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

async function reopenTerminalMessagingLead(
  repository: CrmRepository,
  lead: CrmLead,
  input: FindOrCreateCrmMessagingLeadInput,
  placement: Pick<CrmLead, "pipelineId" | "pipelineStageId">,
) {
  // A fresh inbound message from the customer reopens lost/archived leads;
  // won leads stay won because the sale already happened.
  if (
    input.direction !== "INBOUND" ||
    (lead.status !== "lost" && lead.status !== "archived")
  ) {
    return lead;
  }
  return repository.updateLead({
    leadId: lead.id,
    status: "new",
    ...placement,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

async function enrichExistingCrmMessagingLead(
  repository: CrmRepository,
  lead: CrmLead,
  input: FindOrCreateCrmMessagingLeadInput,
  placement: Pick<CrmLead, "pipelineId" | "pipelineStageId">,
) {
  const buyerName = readEnrichedBuyerName(lead, input.buyerName);
  const buyerEmail = readEnrichedBuyerEmail(lead, input.buyerEmail);
  const buyerPhone =
    input.buyerPhone &&
    input.channel === "WHATSAPP" &&
    shouldBackfillCrmMessagingPhone(lead.buyerPhone, input.buyerPhone, true)
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
  input: FindOrCreateCrmMessagingLeadInput,
) {
  const currentMessaging = readRecord(metadata.crmMessaging);
  if (typeof currentMessaging.firstMessageExternalId === "string") {
    return undefined;
  }
  return {
    ...metadata,
    crmMessaging: {
      ...currentMessaging,
      ...createCrmMessagingLeadMetadata(input).crmMessaging,
    },
  };
}

function createCrmMessagingLeadMetadata(
  input: FindOrCreateCrmMessagingLeadInput,
) {
  return {
    crmMessaging: {
      firstChannel: input.channel,
      firstConnectionId: input.connectionId,
      firstDirection: input.direction,
      firstMessageExternalId: input.externalId,
      firstSource: input.source,
    },
  };
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
