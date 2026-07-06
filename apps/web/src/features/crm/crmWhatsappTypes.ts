export type CrmWhatsappChannel = "OLX_CHAT" | "WEB_CHAT" | "WHATSAPP";
export type CrmWhatsappConnectionId = number | string;
export type CrmWhatsappSessionId = number | string;

export type CrmWhatsappStatus =
  "ACTIVE" | "COMPLETED" | "EXPIRED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
export type CrmWhatsappSessionFilter =
  "all" | "fresh" | "mine" | "others" | "unassigned";

export type CrmWhatsappAssignableMember = {
  activeChatCount?: number;
  email: string | null;
  id: number;
  isActive: boolean;
  name: string;
  role: "MEMBER" | "OWNER" | string;
  seeUnassignedChats: boolean;
};

export type CrmWhatsappConnection = {
  id: CrmWhatsappConnectionId;
  lojaSlug?: string | null;
  name: string;
  phone?: string | null;
  provider?: string;
  status: string;
};

export type CrmWhatsappConnectionLiveStatus =
  | {
      checkedAt: string;
      connected: boolean;
      connectedPhone: string | null;
      providerStatus: "connected" | "disconnected" | "unknown";
      smartphoneConnected: boolean | null;
    }
  | {
      checkedAt: string;
      connected: null;
      connectedPhone: null;
      errorMessage: string;
      providerStatus: "error";
      smartphoneConnected: null;
    };

export type CrmWhatsappProviderConnection = {
  credentials?: CrmWhatsappConnectionCredentialRefs;
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  live: CrmWhatsappConnectionLiveStatus;
  metadata?: CrmWhatsappConnectionMetadata;
  phone: string | null;
  provider: "zapi";
  status: CrmWhatsappConnectionConfiguredStatus;
  webhookEndpoints?: CrmWhatsappWebhookEndpoint[];
  webhookTokenRequired?: boolean;
  webhookUrl: string | null;
};

export type CrmWhatsappConnectionConfiguredStatus =
  "active" | "archived" | "disconnected" | "error" | "paused" | "sandbox";

export type CrmWhatsappConnectionCredentialRefs = {
  apiBaseUrlEnv: string | null;
  clientTokenEnv: string | null;
  instanceIdEnv: string | null;
  instanceTokenEnv: string | null;
  mode: string | null;
};

export type CrmWhatsappConnectionMetadata = {
  catalogPhone: string | null;
  connectedPhone: string | null;
  migrationUnit: string | null;
  purpose: string | null;
};

export type CrmWhatsappWebhookEndpoint = {
  label: string;
  type:
    | "chat-presence"
    | "connected"
    | "delivery"
    | "disconnected"
    | "received"
    | "status";
  url: string;
};

export type CrmWhatsappConnectionsResponse = {
  connections: CrmWhatsappProviderConnection[];
};

export type CrmWhatsappUpdateConnectionInput = {
  catalogPhone?: string | null;
  connectedPhone?: string | null;
  credentialsEnv?: {
    apiBaseUrl: string;
    clientToken: string;
    instanceId: string;
    instanceToken: string;
  };
  displayName?: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  phone?: string | null;
  purpose?: string | null;
  status?: CrmWhatsappConnectionConfiguredStatus;
  webhookUrl?: string | null;
};

export type CrmWhatsappTag = {
  color?: string;
  emoji?: string | null;
  id: string;
  name: string;
  sortOrder?: number;
};

export type CrmWhatsappSession = {
  assignedMember?: Pick<
    CrmWhatsappAssignableMember,
    "email" | "id" | "name" | "role"
  > | null;
  assignedUserId?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  channel: CrmWhatsappChannel;
  connection?: CrmWhatsappConnection | null;
  humanTakeoverAt?: string | null;
  id: CrmWhatsappSessionId;
  lastCustomerReadAt?: string | null;
  leadId?: string | null;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  lastReadAt?: string | null;
  linkedSessionId?: CrmWhatsappSessionId | null;
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
  connectionId?: CrmWhatsappConnectionId;
  filter?: CrmWhatsappSessionFilter;
  leadId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sessionId?: CrmWhatsappSessionId;
  status?: CrmWhatsappStatus;
  tagIds?: string[];
  unreadOnly?: boolean;
};

export type CrmWhatsappSessionCountsQuery = Omit<
  CrmWhatsappSessionQuery,
  "limit" | "offset" | "sessionId"
>;

export type CrmWhatsappSessionCounts = {
  filters: Record<CrmWhatsappSessionFilter, number>;
  statuses: Record<CrmWhatsappStatus, number>;
  total: number;
  unread: number;
};

export type CrmWhatsappAssignSessionInput = {
  assignedUserId: string | null;
};

export type CrmWhatsappInterventionInput = {
  enabled: boolean;
};

export type CrmWhatsappMessageQuery = {
  connectionId?: CrmWhatsappConnectionId;
  limit?: number;
  offset?: number;
};

export type CrmWhatsappSendTextInput = {
  replyToMessageId?: string;
  sessionId: string;
  text: string;
};

export type CrmWhatsappSendReactionInput = {
  reaction: string;
};

export type CrmWhatsappSendMediaType = "audio" | "document" | "image" | "video";

export type CrmWhatsappSendMediaInput = {
  base64: string;
  caption?: string;
  fileName?: string;
  mediaType: CrmWhatsappSendMediaType;
  mimeType?: string;
  sessionId: string;
};

export type * from "./crmWhatsappExtraTypes";
