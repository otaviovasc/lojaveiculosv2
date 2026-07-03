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
  isColumn: boolean;
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

export type IngestCrmWhatsappMessageResult = {
  createdMessage: boolean;
  createdSession: boolean;
  message: CrmWhatsappMessage;
  session: CrmWhatsappSession;
};
