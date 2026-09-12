import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmMessagingChannel } from "./crmConversationRepository.js";

export const crmLeadOutcomeLossReasons = [
  "no_response",
  "price",
  "financing_not_approved",
  "trade_in_valuation",
  "vehicle_unavailable",
  "bought_elsewhere",
  "no_longer_interested",
  "invalid_contact",
  "other",
] as const;

export type CrmLeadOutcomeLossReason =
  (typeof crmLeadOutcomeLossReasons)[number];
export type CrmLeadOutcomeKind = "follow_up" | "lost" | "won";

export type CrmLeadOutcome = {
  actorId: string;
  actorKind: string;
  channel: CrmMessagingChannel | null;
  commandId: string;
  createdAt: Date;
  id: string;
  leadId: string;
  lossNote: string | null;
  lossReason: CrmLeadOutcomeLossReason | null;
  nextPipelineStageId: string | null;
  originSessionId: string | null;
  outcome: CrmLeadOutcomeKind;
  previousPipelineStageId: string | null;
  requestFingerprint: string;
  result: "applied" | "superseded";
  saleId: string | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmLeadOutcomeInput = Omit<
  CrmLeadOutcome,
  "createdAt" | "id"
>;

export type CrmOutcomeRepository = {
  create: (input: CreateCrmLeadOutcomeInput) => Promise<CrmLeadOutcome>;
  findByCommandId: (input: {
    commandId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmLeadOutcome | null>;
  lockLead: (input: {
    leadId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<void>;
};
