import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmWhatsappChannel,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
  CrmWhatsappSessionStatus,
} from "./crmWhatsappRepositoryTypes.js";
import type { CrmWhatsappScheduledMessageStatus } from "./crmWhatsappRepositoryModels.js";

export type CountCrmWhatsappSessionsInput = {
  assignedUserId?: UserId;
  connectionId?: string;
  filter?: "all" | "fresh" | "mine" | "others" | "unassigned";
  leadId?: string;
  search?: string;
  sessionId?: string;
  status?: CrmWhatsappSessionStatus;
  tagIds?: string[];
  storeId: StoreId;
  tenantId: TenantId;
  unreadOnly?: boolean;
};

export type ListCrmWhatsappSessionsInput = CountCrmWhatsappSessionsInput & {
  limit: number;
  offset: number;
};

export type ListCrmWhatsappMessagesInput = {
  limit: number;
  offset: number;
  sessionId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type IngestCrmWhatsappMessageInput = {
  buyerChatLid?: string;
  buyerName?: string;
  buyerPhone: string;
  channel: CrmWhatsappChannel;
  connectionId: string;
  content: string;
  direction: CrmWhatsappMessageDirection;
  externalId: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  providerTimestamp: Date;
  senderType: CrmWhatsappMessageSenderType;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  leadId?: string | null;
  status: CrmWhatsappMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  type: CrmWhatsappMessageType;
};

export type UpdateCrmWhatsappSessionInput = {
  assignedUserId?: UserId | null;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  humanTakeoverAt?: Date | null;
  lastAssignedAt?: Date | null;
  lastCustomerReadAt?: Date | null;
  lastReadAt?: Date | null;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
  sessionId: string;
  status?: CrmWhatsappSessionStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmWhatsappMessageByExternalIdInput = {
  connectionId: string;
  externalId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmWhatsappMessageByIdInput = {
  messageId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmWhatsappMessageInput = {
  deletedAt?: Date | null;
  externalId?: string | null;
  messageId: string;
  metadata?: Record<string, unknown>;
  providerTimestamp?: Date | null;
  status?: CrmWhatsappMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindOrCreateCrmWhatsappTagInput = {
  color?: string;
  connectionId?: string | null;
  emoji?: string | null;
  name: string;
  sortOrder?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmWhatsappTagInput = FindOrCreateCrmWhatsappTagInput;

export type UpdateCrmWhatsappTagInput = {
  color?: string;
  emoji?: string | null;
  id: string;
  name?: string;
  sortOrder?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type DeleteCrmWhatsappTagInput = {
  id: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ReorderCrmWhatsappTagsInput = {
  storeId: StoreId;
  tagIds: readonly string[];
  tenantId: TenantId;
};

export type ListCrmWhatsappTagsInput = {
  connectionId?: string | null;
  limit: number;
  search?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmWhatsappSessionTagInput = {
  sessionId: string;
  storeId: StoreId;
  tagId: string;
  tenantId: TenantId;
};

export type CreateCrmWhatsappScheduledMessageInput = {
  campaignId?: string | null;
  campaignMessageType?: string | null;
  campaignRecipientKey?: string | null;
  campaignSequence?: number | null;
  connectionId: string;
  createdByUserId?: UserId | null;
  metadata?: Record<string, unknown>;
  phone: string;
  scheduledAt: Date;
  sessionId: string;
  storeId: StoreId;
  tenantId: TenantId;
  text: string;
};

export type ListCrmWhatsappScheduledMessagesInput = {
  campaignId?: string;
  connectionId?: string;
  limit: number;
  sessionId?: string;
  status?: CrmWhatsappScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmWhatsappScheduledMessagesInput = {
  dueAt: Date;
  limit: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmWhatsappScheduledMessageScopesInput = {
  dueAt: Date;
  limit: number;
};

export type UpdateCrmWhatsappScheduledMessageInput = {
  cancelledAt?: Date | null;
  errorMessage?: string | null;
  expectedStatus?: CrmWhatsappScheduledMessageStatus;
  id: string;
  sentAt?: Date | null;
  sentMessageId?: string | null;
  status: CrmWhatsappScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};
