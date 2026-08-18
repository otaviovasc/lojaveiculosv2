import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { CrmWhatsappScheduledMessageStatus } from "./crmWhatsappRepositoryModels.js";

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
  scheduledMessageId?: string;
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
