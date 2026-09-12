import type {
  CrmCampaign,
  CrmScheduledMessage,
} from "../../../../domains/crm/ports/crmConversationRepository.js";

export function hasCampaignBookkeepingPending(
  message: Pick<CrmScheduledMessage, "metadata">,
) {
  return message.metadata.campaignBookkeepingPending === true;
}

export function isProcessableScheduledMessage(
  message: CrmScheduledMessage,
  campaigns: readonly CrmCampaign[],
) {
  if (!message.campaignId) return true;
  const campaign = campaigns.find(
    (item) =>
      item.id === message.campaignId &&
      item.storeId === message.storeId &&
      item.tenantId === message.tenantId,
  );
  return campaign?.status === "scheduled";
}

export function isProcessableSpecialDate(
  message: Pick<CrmScheduledMessage, "metadata" | "status">,
  configs: readonly { id: string; revision: number }[] | undefined,
) {
  // A stale sending row may already have a confirmed provider receipt. Keep
  // it discoverable so receipt-first replay can finalize it after a config is
  // disabled or revised; pending rows still require the current revision.
  if (message.status === "sending" || !configs) return true;
  const value = message.metadata.specialDate;
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const metadata = value as Record<string, unknown>;
  return configs.some(
    (config) =>
      metadata.configId === config.id &&
      metadata.configRevision === config.revision,
  );
}

export function cloneScheduledMessage(message: CrmScheduledMessage) {
  return structuredClone(message);
}
