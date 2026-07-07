import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmWhatsappChannel,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
  CrmWhatsappSessionStatus,
} from "./crmWhatsappRepositoryTypes.js";

export type CrmWhatsappSession = {
  assignedUserId: UserId | null;
  buyerChatLid: string | null;
  buyerName: string | null;
  buyerPhone: string;
  channel: CrmWhatsappChannel;
  channelExternalId: string | null;
  channelMetadata: Record<string, unknown>;
  connectionId: string;
  createdAt: Date;
  externalSessionId: string | null;
  firstHandledAt: Date | null;
  freshLeadAt: Date | null;
  humanTakeoverAt: Date | null;
  id: string;
  lastAssignedAt: Date | null;
  lastCustomerReadAt: Date | null;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  lastReadAt: Date | null;
  leadId: string | null;
  messageCount: number;
  metadata: Record<string, unknown>;
  profilePhotoUrl: string | null;
  sessionTags: CrmWhatsappTag[];
  source: string | null;
  status: CrmWhatsappSessionStatus;
  storeId: StoreId;
  tenantId: TenantId;
  unreadCount: number;
  updatedAt: Date;
};

export type CrmWhatsappTag = {
  color: string;
  connectionId: string | null;
  emoji: string | null;
  id: string;
  name: string;
  sortOrder: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmWhatsappMessage = {
  channel: CrmWhatsappChannel;
  channelMessageId: string | null;
  connectionId: string;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
  direction: CrmWhatsappMessageDirection;
  externalId: string | null;
  id: string;
  mediaType: string | null;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  providerTimestamp: Date | null;
  senderType: CrmWhatsappMessageSenderType;
  sessionId: string;
  status: CrmWhatsappMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  type: CrmWhatsappMessageType;
  updatedAt: Date;
};

export type CrmWhatsappScheduledMessageStatus =
  "cancelled" | "failed" | "pending" | "sending" | "sent";

export type CrmWhatsappCampaignStatus =
  "cancelled" | "completed" | "draft" | "paused" | "scheduled";

export type CrmWhatsappCampaignRecipientStatus =
  | "cancelled"
  | "failed"
  | "pending"
  | "replied"
  | "secondary_scheduled"
  | "secondary_sent"
  | "sent";

export type CrmWhatsappCampaign = {
  content: string;
  createdAt: Date;
  createdByUserId: UserId | null;
  failedCount: number;
  id: string;
  initialTagId: string | null;
  intervalMinutes: number;
  mediaType: string | null;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  name: string;
  repliedCount: number;
  replyRate: number;
  replyTagId: string | null;
  scheduledCount: number;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
  secondaryContent: string | null;
  secondaryDelayMinutes: number;
  secondarySentCount: number;
  selectedConnectionId: string | null;
  sentCount: number;
  status: CrmWhatsappCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
  totalRecipients: number;
  updatedAt: Date;
};

export type CrmWhatsappScheduledMessage = {
  cancelledAt: Date | null;
  campaignId: string | null;
  campaignMessageType: string | null;
  campaignRecipientKey: string | null;
  campaignSequence: number | null;
  connectionId: string;
  createdAt: Date;
  createdByUserId: UserId | null;
  errorMessage: string | null;
  id: string;
  metadata: Record<string, unknown>;
  phone: string;
  scheduledAt: Date;
  sentAt: Date | null;
  sentMessageId: string | null;
  sessionId: string;
  status: CrmWhatsappScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  text: string;
  updatedAt: Date;
};

export type CrmWhatsappCampaignRecipient = {
  campaignId: string;
  connectionId: string;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  initialScheduledMessageId: string | null;
  initialSentAt: Date | null;
  leadId: string | null;
  phone: string;
  replyContentPreview: string | null;
  replyMessageId: string | null;
  replyReceivedAt: Date | null;
  secondaryScheduledMessageId: string | null;
  secondarySentAt: Date | null;
  sentMessageId: string | null;
  sequence: number;
  sessionId: string;
  status: CrmWhatsappCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
  variables: Record<string, unknown>;
};

export type CrmWhatsappScheduledMessageScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type IngestCrmWhatsappMessageResult = {
  createdMessage: boolean;
  createdSession: boolean;
  message: CrmWhatsappMessage;
  session: CrmWhatsappSession;
};
