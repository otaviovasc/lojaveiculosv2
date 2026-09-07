import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmSpecialDateType } from "../messaging/crmSpecialDateCalculator.js";
import type { CrmMessagingChannel } from "./crmConversationRepositoryTypes.js";
import type { CrmConversationRepository } from "./crmConversationRepository.js";
import type { CrmOutboundIntentRepository } from "./crmOutboundIntentRepository.js";

export type CrmSpecialDateConfig = {
  connectionId: string;
  createdAt: Date;
  dateType: CrmSpecialDateType;
  enabled: boolean;
  id: string;
  leadDays: number;
  messageTemplate: string;
  revision: number;
  sendTime: string;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type CrmSpecialDateConfigScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmSpecialDateConfigScopePage = {
  nextCursor: string | null;
  scopes: readonly CrmSpecialDateConfigScope[];
};

export type UpsertCrmSpecialDateConfigInput = {
  connectionId: string;
  dateType: CrmSpecialDateType;
  enabled: boolean;
  leadDays?: number;
  messageTemplate?: string;
  expectedRevision?: number;
  sendTime?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmSpecialDateExecution = {
  connectionId: string;
  configRevision: number;
  createdAt: Date;
  dateType: CrmSpecialDateType;
  id: string;
  recipientKey: string;
  scheduledMessageId: string | null;
  status: string;
  storeId: StoreId;
  targetYear: number;
  tenantId: TenantId;
  updatedAt: Date;
};

export type SpecialDateRecipientCandidate = {
  closedAt?: Date;
  key: string;
  name: string;
  phone: string;
  rawDate?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ScheduleSpecialDateAtomicInput = {
  configId: string;
  configRevision: number;
  connectionId: string;
  content: string;
  customerDisplayName?: string;
  customerPhone: string;
  dateType: CrmSpecialDateType;
  channel?: CrmMessagingChannel;
  metadata?: Record<string, unknown>;
  recipientAddress: string;
  recipientKey: string;
  scheduledAt: Date;
  storeId: StoreId;
  targetYear: number;
  tenantId: TenantId;
};

export type ScheduleSpecialDateAtomicResult = {
  executionId?: string;
  scheduled: boolean;
  scheduledMessageId?: string;
};

export interface CrmSpecialDateRepository {
  cancelPendingSpecialDateExecutions(
    tenantId: TenantId,
    storeId: StoreId,
    connectionId: string,
    dateType: CrmSpecialDateType,
  ): Promise<number>;
  findAnniversaryRecipients(
    tenantId: TenantId,
    storeId: StoreId,
  ): Promise<readonly SpecialDateRecipientCandidate[]>;
  findAudienceRecipients(
    tenantId: TenantId,
    storeId: StoreId,
  ): Promise<readonly SpecialDateRecipientCandidate[]>;
  findBirthdayRecipients(
    tenantId: TenantId,
    storeId: StoreId,
  ): Promise<readonly SpecialDateRecipientCandidate[]>;
  listConfigsByConnection(
    tenantId: TenantId,
    storeId: StoreId,
    connectionId: string,
  ): Promise<readonly CrmSpecialDateConfig[]>;
  listEnabledConfigs(
    tenantId: TenantId,
    storeId: StoreId,
  ): Promise<readonly CrmSpecialDateConfig[]>;
  listEnabledConfigScopes(input: {
    cursor?: string;
    limit: number;
  }): Promise<CrmSpecialDateConfigScopePage>;
  scheduleSpecialDateAtomic(
    input: ScheduleSpecialDateAtomicInput,
  ): Promise<ScheduleSpecialDateAtomicResult>;
  upsertConfig(
    input: UpsertCrmSpecialDateConfigInput,
  ): Promise<CrmSpecialDateConfig>;
}

export type MemoryCrmSpecialDateRepositoryOptions = {
  anniversaryRecipients?: SpecialDateRecipientCandidate[];
  audienceRecipients?: SpecialDateRecipientCandidate[];
  birthdayRecipients?: SpecialDateRecipientCandidate[];
  configs?: Array<
    Omit<CrmSpecialDateConfig, "revision"> & { revision?: number }
  >;
  conversationRepository?: Pick<
    CrmConversationRepository,
    | "createScheduledMessage"
    | "findConversationCycleByIdentity"
    | "listScheduledMessages"
    | "updateScheduledMessage"
    | "upsertConversationCycleContext"
  >;
  outboundIntentRepository?: Pick<
    CrmOutboundIntentRepository,
    "findByIdempotencyKey"
  >;
};
