import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmMessagingChannel,
  CrmHumanAttendanceState,
  CrmMessageDirection,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmMessageStatus,
  CrmMessageType,
  CrmConversationCycleStatus,
} from "./crmConversationRepositoryTypes.js";

export type CrmAssigneeConversationCycleCount = {
  assigneeId: UserId;
  count: number;
};

export type CrmConversationCycle = {
  archivedAt: Date | null;
  assignedUserId: UserId | null;
  customerChatId: string | null;
  customerDisplayName: string | null;
  customerPhone: string;
  channel: CrmMessagingChannel;
  externalThreadId: string | null;
  channelMetadata: Record<string, unknown>;
  connectionId: string;
  createdAt: Date;
  deletedAt: Date | null;
  externalCycleId: string | null;
  firstHandledAt: Date | null;
  freshLeadAt: Date | null;
  humanAttendanceChangedAt: Date | null;
  humanAttendanceState: CrmHumanAttendanceState | null;
  humanAttendanceStateVersion: number | null;
  humanHandlingStartedAt: Date | null;
  humanTakeoverAt: Date | null;
  interventionId: string | null;
  id: string;
  lastAssignedAt: Date | null;
  lastCustomerReadAt: Date | null;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  lastReadAt: Date | null;
  leadId: string | null;
  messageCount: number;
  metadata: Record<string, unknown>;
  pinnedAt: Date | null;
  profilePhotoUrl: string | null;
  revision: number;
  tags: CrmTag[];
  threadId?: string;
  source: string | null;
  status: CrmConversationCycleStatus;
  storeId: StoreId;
  tenantId: TenantId;
  unreadCount: number;
  updatedAt: Date;
};

export type CrmTag = {
  color: string;
  connectionId: string | null;
  emoji: string | null;
  id: string;
  name: string;
  sortOrder: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmMessage = {
  channel: CrmMessagingChannel;
  channelMessageId: string | null;
  connectionId: string;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
  direction: CrmMessageDirection;
  externalId: string | null;
  id: string;
  mediaType: string | null;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  providerTimestamp: Date | null;
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  cycleId: string;
  status: CrmMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  type: CrmMessageType;
  updatedAt: Date;
};

export type CrmScheduledMessageStatus =
  "cancelled" | "failed" | "pending" | "sending" | "sent";

export type CrmCampaignStatus =
  "cancelled" | "completed" | "draft" | "paused" | "scheduled";

export type CrmCampaignRecipientStatus =
  | "cancelled"
  | "failed"
  | "pending"
  | "replied"
  | "secondary_scheduled"
  | "secondary_sent"
  | "sent";

export type CrmCampaign = {
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
  status: CrmCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
  totalRecipients: number;
  updatedAt: Date;
};

export type CrmScheduledMessage = {
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
  recipientAddress: string;
  scheduledAt: Date;
  sentAt: Date | null;
  sentMessageId: string | null;
  cycleId: string;
  status: CrmScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  content: string;
  updatedAt: Date;
};

export type CrmCampaignRecipient = {
  campaignId: string;
  connectionId: string;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  initialScheduledMessageId: string | null;
  initialSentAt: Date | null;
  leadId: string | null;
  recipientAddress: string;
  replyContentPreview: string | null;
  replyMessageId: string | null;
  replyReceivedAt: Date | null;
  secondaryScheduledMessageId: string | null;
  secondarySentAt: Date | null;
  sentMessageId: string | null;
  sequence: number;
  cycleId: string;
  status: CrmCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
  variables: Record<string, unknown>;
};

export type CrmScheduledMessageScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type IngestCrmMessageResult = {
  createdMessage: boolean;
  createdConversationCycle: boolean;
  message: CrmMessage;
  conversationCycle: CrmConversationCycle;
};
