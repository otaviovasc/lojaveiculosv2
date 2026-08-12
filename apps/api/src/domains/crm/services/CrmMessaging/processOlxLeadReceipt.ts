import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmProviderWebhookEvent } from "../../ports/crmWebhookEventRepository.js";
import {
  openOlxLeadReceiptPayload,
  type OlxLeadReceiptPayload,
} from "../../messaging/olxLeadReceipt.js";
import {
  getCrmRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "../CrmWhatsapp/serviceSupport.js";

const permission = "crm.whatsapp.ingest" as const;

export async function processOlxLeadReceipt(
  context: ServiceContext,
  event: CrmProviderWebhookEvent,
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
  if (!event.connectionId || !event.storeId || !event.tenantId) {
    throw new Error("Invalid durable OLX lead receipt.");
  }
  const connectionId = event.connectionId;
  const storeId = event.storeId;
  const tenantId = event.tenantId;
  const receipt = await openOlxLeadReceiptPayload(
    getCrmConnectionCredentialVault(ports),
    { connectionId, storeId, tenantId },
    event.payload,
  );
  if (!receipt) throw new Error("Invalid durable OLX lead receipt.");
  const result = await runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmRepository(transactionPorts);
    const lead = await repository.createLeadIdempotently({
      buyerEmail: receipt.buyerEmail,
      buyerName: receipt.buyerName,
      buyerPhone: receipt.buyerPhone,
      metadata: leadMetadata(connectionId, receipt),
      source: "olx",
      sourceIdentityKey: receipt.identityKey,
      storeId,
      tenantId,
    });
    const activity = await repository.createActivityIdempotently({
      activityType: "note",
      content: receipt.message,
      createdByUserId: null,
      direction: "inbound",
      idempotencyFingerprint: receipt.identityKey,
      idempotencyKey: `olx-lead:${receipt.identityKey}`,
      leadId: lead.lead.id,
      metadata: activityMetadata(connectionId, receipt),
      occurredAt: new Date(receipt.createdAt),
      storeId,
      tenantId,
    });
    return {
      activityId: activity.activity.id,
      created: lead.created || activity.created,
    };
  });
  logWhatsappServiceEvent(context, "crm.lead.webhook.olx.processed", {
    connectionId,
    created: result.created,
    provider: "olx",
    providerEventId: event.id,
    storeId,
    tenantId,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.lead.webhook.olx.processed",
    category: "data_change",
    entityId: result.activityId,
    entityType: "lead_activity",
    metadata: {
      connectionId,
      duplicate: !result.created,
      hasPhone: Boolean(receipt.buyerPhone),
      provider: "olx",
      providerEventId: event.id,
    },
    permission,
    storeId,
    summary: "Processed durable OLX lead webhook",
    tenantId,
  });
  return result;
}

type Receipt = OlxLeadReceiptPayload;

function leadMetadata(connectionId: string, receipt: Receipt) {
  return {
    ...(receipt.adId ? { adId: receipt.adId } : {}),
    ...(Object.keys(receipt.adsInfo).length
      ? { adsInfo: receipt.adsInfo }
      : {}),
    connectionId,
    linkAd: receipt.linkAd,
    listId: receipt.listId,
    olxSource: receipt.source,
    provider: "olx",
  };
}

function activityMetadata(connectionId: string, receipt: Receipt) {
  return {
    ...(receipt.adId ? { adId: receipt.adId } : {}),
    connectionId,
    linkAd: receipt.linkAd,
    listId: receipt.listId,
    olxSource: receipt.source,
    provider: "olx",
  };
}
