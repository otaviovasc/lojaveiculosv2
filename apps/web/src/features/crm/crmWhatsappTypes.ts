export type CrmWhatsappChannel =
  "INSTAGRAM" | "OLX_CHAT" | "WEB_CHAT" | "WHATSAPP" | (string & {});
export type CrmWhatsappProvider =
  | "composio_instagram"
  | "composio_whatsapp"
  | "olx_chat"
  | "zapi"
  | (string & {});
export type CrmWhatsappConnectionId = number | string;
export type CrmWhatsappSessionId = number | string;

export type CrmWhatsappStatus =
  "ACTIVE" | "COMPLETED" | "EXPIRED" | "HUMAN_TAKEOVER" | "MINIBOT_ACTIVE";
export type CrmWhatsappHumanAttendanceState =
  "IN_HUMAN_SERVICE" | "WAITING_HUMAN";
export type CrmWhatsappMessageSenderOrigin =
  | "customer"
  | "human_crm"
  | "human_whatsapp"
  | "bot_api"
  | "system"
  | "unknown";
export type CrmWhatsappRealtimeStatus =
  "connecting" | "connected" | "degraded" | "offline";
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
  capabilities?: CrmWhatsappProviderCapabilities;
  id: CrmWhatsappConnectionId;
  lojaSlug?: string | null;
  name: string;
  phone?: string | null;
  provider?: string;
  status: string;
};

/** Capability facts returned by the CRM connection DTO. Keep this contract
 * server-owned: the UI must not infer provider support from provider names. */
export type CrmWhatsappProviderCapabilities = {
  audio: boolean;
  catalog: boolean;
  conversationStart: boolean;
  delete: boolean;
  documents: boolean;
  imageCaption: boolean;
  images: boolean;
  location: boolean;
  quickMessages: boolean;
  reactions: boolean;
  reply: boolean;
  scheduling: boolean;
  templates: boolean;
  text: boolean;
  vehicle: boolean;
  video: boolean;
  officialWindowNotice?: string | null;
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
  capabilities?: CrmWhatsappProviderCapabilities;
  credentials?: CrmWhatsappConnectionCredentialRefs;
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  live: CrmWhatsappConnectionLiveStatus;
  metadata?: CrmWhatsappConnectionMetadata;
  phone: string | null;
  provider: CrmWhatsappProvider;
  ready?: boolean;
  setup?: CrmWhatsappZapiSetupState | null;
  status: CrmWhatsappConnectionConfiguredStatus;
  webhookEndpoints?: CrmWhatsappWebhookEndpoint[];
  webhookTokenRequired?: boolean;
  webhookUrl: string | null;
};

export type CrmWhatsappConnectionConfiguredStatus =
  "active" | "archived" | "disconnected" | "error" | "paused" | "sandbox";

export type CrmWhatsappConnectionCredentialRefs = {
  apiBaseUrlEnv: string | null;
  apiKeyEnv?: string | null;
  clientTokenEnv: string | null;
  composioConnectedAccountConfigured?: boolean;
  instanceIdEnv: string | null;
  instanceTokenEnv: string | null;
  mode: string | null;
  storedInstanceConfigured?: boolean;
};

export type CrmWhatsappConnectionMetadata = {
  catalogPhone: string | null;
  connectedPhone: string | null;
  migrationUnit: string | null;
  purpose: string | null;
};

export type CrmWhatsappZapiSetupState = {
  attemptCount: number;
  configuredAt: string | null;
  lastErrorCode: string | null;
  requestedAt: string;
  requiredTypes: readonly string[];
  status: "configured" | "configuring" | "failed" | "partial";
  succeededTypes: readonly string[];
  supportCode: string;
  updatedAt: string;
  version: 1;
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

export type CrmWhatsappWebhookConfigResult = {
  error: string | null;
  ok: boolean;
  status: number | null;
  type: string;
  url: string;
};

export type CrmWhatsappZapiWebhookSetupResult = {
  results: readonly CrmWhatsappWebhookConfigResult[];
  setup: CrmWhatsappZapiSetupState;
};

export type CrmWhatsappConnectionsResponse = {
  allowance: CrmWhatsappConnectionAllowance;
  availableProviders: CrmWhatsappSetupProvider[];
  connections: CrmWhatsappProviderConnection[];
};

export type CrmWhatsappSetupProvider = Extract<
  CrmWhatsappProvider,
  "composio_whatsapp" | "zapi"
>;

export type CrmWhatsappZapiAddonContractStatus =
  "active" | "cancelled" | "paid_awaiting_setup" | "pending" | "scheduled";

export type CrmWhatsappZapiAddonContract = {
  addonCode: "crm_zapi";
  cancellationScheduledFor: string | null;
  id: string;
  monthlyPriceCents: number;
  paidAt: string | null;
  scheduledFor: string | null;
  setupCompletedAt: string | null;
  status: CrmWhatsappZapiAddonContractStatus;
  storeId: string;
  supportCode: string | null;
};

export type CrmWhatsappConnectionAllowance = {
  limit: number;
  remaining: number;
  used: number;
};

export type CrmWhatsappCreateConnectionInput =
  | {
      instanceId: string;
      instanceToken: string;
      provider: "zapi";
    }
  | {
      provider: "composio_whatsapp";
    };

export type CrmWhatsappZapiPairingQr = {
  expiresAt: string;
  qrCode: string;
};

export type CrmWhatsappZapiPairingCode = {
  code?: string;
  expiresAt?: string;
  requested: boolean;
};

export type CrmWhatsappComposioAuthorization = {
  expiresAt: string;
  redirectUrl: string;
};

export type CrmWhatsappComposioSender = {
  displayName?: string | null;
  phone?: string | null;
  senderId: string;
};

export type CrmWhatsappComposioCompleteResult = {
  connection: CrmWhatsappProviderConnection;
  nextAction: string | null;
  senders: CrmWhatsappComposioSender[];
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
  humanAttendanceChangedAt?: string | null;
  humanAttendanceState?: CrmWhatsappHumanAttendanceState | null;
  humanAttendanceStateVersion?: number | null;
  humanHandlingStartedAt?: string | null;
  id: CrmWhatsappSessionId;
  interventionHistoryStartedAt?: string | null;
  interventionId?: string | null;
  lastCustomerReadAt?: string | null;
  leadId?: string | null;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  lastReadAt?: string | null;
  linkedSessionId?: CrmWhatsappSessionId | null;
  metadata?: Record<string, unknown>;
  profilePhotoUrl?: string | null;
  revision?: number;
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
  senderOrigin?: CrmWhatsappMessageSenderOrigin;
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
  assigneeId?: string;
  connectionId?: CrmWhatsappConnectionId;
  filter?: CrmWhatsappSessionFilter;
  humanAttendanceState?: CrmWhatsappHumanAttendanceState;
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
  "assigneeId" | "limit" | "offset" | "sessionId"
>;

export type CrmWhatsappSessionCounts = {
  assignees: Array<{ assigneeId: string; count: number }>;
  filters: Record<CrmWhatsappSessionFilter, number>;
  inHumanService: number;
  statuses: Record<CrmWhatsappStatus, number>;
  total: number;
  unread: number;
  waitingHuman: number;
};

export type CrmWhatsappAssignSessionInput = {
  assignedUserId: string | null;
  expectedRevision: number;
};

export type CrmWhatsappInterventionInput = {
  enabled: boolean;
  expectedRevision: number;
};

export type CrmWhatsappSessionRevisionInput = {
  expectedRevision: number;
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
