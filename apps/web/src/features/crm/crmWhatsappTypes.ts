export type CrmWhatsappChannel = "OLX_CHAT" | "WEB_CHAT" | "WHATSAPP";

export type CrmWhatsappStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "HUMAN_TAKEOVER"
  | "MINIBOT_ACTIVE";

export type CrmWhatsappAgent = {
  activeChatCount?: number;
  email: string | null;
  id: number;
  isActive: boolean;
  name: string;
  role: "AGENT" | "OWNER" | string;
  seeUnassignedChats: boolean;
};

export type CrmWhatsappConnection = {
  id: number;
  name: string;
  phone?: string | null;
  provider?: string;
  status: string;
};

export type CrmWhatsappTag = {
  color?: string;
  emoji?: string | null;
  id: number;
  name: string;
};

export type CrmWhatsappSession = {
  assignedAgent?: Pick<CrmWhatsappAgent, "email" | "id" | "name" | "role"> | null;
  assignedAgentId?: number | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  channel: CrmWhatsappChannel;
  connection?: CrmWhatsappConnection | null;
  humanTakeoverAt?: string | null;
  id: number;
  lastCustomerReadAt?: string | null;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  lastReadAt?: string | null;
  linkedSessionId?: number | null;
  metadata?: Record<string, unknown>;
  profilePhotoUrl?: string | null;
  sessionTags?: CrmWhatsappTag[];
  status: CrmWhatsappStatus;
  unreadCount?: number | undefined;
  uuid: string;
  vehicle?: {
    id?: number;
    mainPhotoUrl?: string | null;
    title?: string | null;
  } | null;
};

export type CrmWhatsappMessage = {
  channel?: CrmWhatsappChannel;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
  direction: "INBOUND" | "OUTBOUND";
  externalId?: string | null;
  id: number | string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
  providerTimestamp?: string | null;
  senderType: "AI" | "CUSTOMER" | "HUMAN" | "SYSTEM" | string;
  status: "DELIVERED" | "FAILED" | "PENDING" | "READ" | "SENT" | string;
  type:
    | "AUDIO"
    | "CATALOG"
    | "CONTACT"
    | "DOCUMENT"
    | "IMAGE"
    | "INTERACTIVE"
    | "LOCATION"
    | "STICKER"
    | "TEMPLATE"
    | "TEXT"
    | "VIDEO"
    | string;
  uuid?: string;
};

export type CrmWhatsappSessionQuery = {
  connectionId?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sessionId?: number;
};

export type CrmWhatsappSendTextInput = {
  quotedMessageId?: number | string;
  quotedMessageText?: string;
  sessionId: number;
  text: string;
};
