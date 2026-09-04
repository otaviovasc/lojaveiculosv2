import type {
  CrmAvailableSetup,
  CrmChannel,
  CrmChannelConnectionDto,
  CrmConversationCycleCountsResponse,
  CrmConversationCycleDto,
  CrmConversationCycleStatus,
  CrmHumanAttendanceState,
  CrmMessageDto,
  CrmMessageSenderOrigin,
  CrmProvider,
  CrmUazapiInstanceSummary,
} from "@lojaveiculosv2/shared";

export type {
  CrmAvailableSetup,
  CrmConversationCycleCountsResponse as CrmConversationCycleCounts,
  CrmConversationCycleStatus,
  CrmHumanAttendanceState,
  CrmMessageSenderOrigin,
  CrmUazapiInstanceSummary,
};

/** Parsed server cycle plus UI enrichments used by provider setup and tag
 * management surfaces. The API boundary still validates the shared DTO. */
export type CrmConversationCycle = Omit<
  CrmConversationCycleDto,
  "connection" | "revision" | "tags"
> & {
  connection?: CrmProviderConnection | null | undefined;
  revision?: number | undefined;
  tags?: CrmTag[] | undefined;
};

/** Canonical messages plus the local optimistic state used before the server
 * returns a fully identified message DTO. */
export type CrmMessage = Omit<
  CrmMessageDto,
  "channel" | "senderOrigin" | "status"
> & {
  channel?: CrmMessageDto["channel"];
  senderOrigin?: CrmMessageSenderOrigin;
  status: CrmMessageDto["status"] | "INDETERMINATE" | "PROVIDER_UNKNOWN";
};

export type CrmConnectionId = number | string;
export type CrmConversationCycleId = string;

export type CrmRealtimeStatus =
  "connecting" | "connected" | "degraded" | "offline";
export type CrmContactPresence = "online" | "typing";
export type CrmConversationCycleFilter =
  "all" | "fresh" | "mine" | "others" | "unassigned";

export type CrmAssignableMember = {
  activeChatCount?: number;
  email: string | null;
  id: number;
  isActive: boolean;
  name: string;
  role: "MEMBER" | "OWNER" | string;
  seeUnassignedChats: boolean;
};

/** Capability facts returned by the CRM connection DTO. Keep this contract
 * server-owned: the UI must not infer provider support from provider names. */
export type CrmProviderCapabilities = {
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

export type CrmConnectionLiveStatus =
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

/** Setup screens may enrich the canonical connection DTO with provider-local
 * operational details. The overview contract also carries the safe live
 * provider status used by connection management surfaces. */
export type CrmProviderConnection = {
  capabilities?:
    CrmChannelConnectionDto["capabilities"] | CrmProviderCapabilities;
  channel?: CrmChannel;
  credentials?: CrmConnectionCredentialRefs;
  displayName: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  id: string;
  isDefault?: boolean;
  live?: CrmConnectionLiveStatus | undefined;
  memberUserIds?: readonly string[] | undefined;
  metadata?: CrmConnectionMetadata;
  phone?: string | null;
  phoneNumber?: string | null | undefined;
  provider: CrmProvider;
  purpose?: CrmChannelConnectionDto["purpose"];
  revision?: number | undefined;
  routingStatus?: "ready" | "preserved" | "deferred" | undefined;
  readiness?: {
    ready: boolean;
    reason: string | null;
    reasonCode: string | null;
  };
  ready?: boolean;
  setup?: CrmWhatsappZapiSetupState | null | undefined;
  state?: CrmConnectionConfiguredStatus;
  status?: CrmConnectionConfiguredStatus;
  webhookEndpoints?: CrmWhatsappWebhookEndpoint[];
  webhookTokenRequired?: boolean;
  webhookUrl?: string | null;
};

export type CrmConnectionConfiguredStatus =
  "active" | "archived" | "disconnected" | "error" | "paused" | "sandbox";

export type CrmConnectionCredentialRefs = {
  apiBaseUrlEnv: string | null;
  apiKeyEnv?: string | null;
  clientTokenEnv: string | null;
  composioConnectedAccountConfigured?: boolean;
  instanceIdEnv: string | null;
  instanceTokenEnv: string | null;
  mode: string | null;
  storedInstanceConfigured?: boolean;
};

export type CrmConnectionMetadata = {
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
  version: 1 | 2;
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

export type CrmSetupProvider = Extract<
  CrmProvider,
  "meta_cloud" | "uazapi" | "zapi"
>;

export type CrmOfficialChannelSetupProvider = Exclude<
  CrmSetupProvider,
  "uazapi" | "zapi"
>;

export type CrmCreateConnectionInput =
  | {
      channel: "whatsapp";
      clientToken: string;
      instanceId: string;
      instanceToken: string;
      provider: "zapi";
    }
  | {
      adminToken: string;
      baseUrl?: string;
      channel: "whatsapp";
      connectionPhoneNumber?: string;
      displayName: string;
      mode: "create";
      provider: "uazapi";
    }
  | {
      adminToken: string;
      baseUrl?: string;
      channel: "whatsapp";
      displayName: string;
      instanceId: string;
      mode: "attach";
      provider: "uazapi";
    }
  | {
      channel: Extract<CrmChannel, "instagram" | "whatsapp">;
      provider: CrmOfficialChannelSetupProvider;
    };

/** Input for POST /crm/channel-connections/uazapi/list-instances. The admin
 * token is a write-only, store-scoped credential: sent for validation and
 * instance provisioning, never read back or displayed after entry. */
export type CrmUazapiListInstancesInput = {
  adminToken: string;
  baseUrl?: string;
};

export type CrmZapiCredentialsInput = {
  clientToken: string;
  expectedRevision?: number;
  instanceId: string;
  instanceToken: string;
};

export type CrmZapiReplacementInput = CrmZapiCredentialsInput & {
  expectedRevision: number;
  idempotencyKey: string;
};

export type CrmZapiReplacementResult = {
  connection: CrmProviderConnection;
  operationId: string;
  status: "verifying" | "verified" | "failed" | "completed";
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

/** UAZAPI reuses the WhatsApp pairing/webhook payload shapes; only the
 * provisioning differs (server-owned instance, no user credentials). */
export type CrmWhatsappUazapiPairingQr = CrmWhatsappZapiPairingQr;
export type CrmWhatsappUazapiPairingCode = CrmWhatsappZapiPairingCode;
export type CrmWhatsappUazapiWebhookSetupResult =
  CrmWhatsappZapiWebhookSetupResult;

export type CrmConnectionMember = {
  createdAt: string;
  grantedBy: string | null;
  userId: string;
};

export type CrmConnectionMemberRevokeResult = {
  activeAssignedConversationCount: number;
  revoked: boolean;
};

export type CrmComposioAuthorization = {
  expiresAt: string;
  redirectUrl: string;
};

export type CrmComposioSender = {
  accountType?: "BUSINESS" | "CREATOR" | null;
  displayName?: string | null;
  loginMode?: "facebook" | "instagram" | null;
  pageId?: string | null;
  phone?: string | null;
  senderId: string;
  subscriptionTargetId?: string | null;
  username?: string | null;
};

export type CrmComposioCompleteResult = {
  connection: CrmProviderConnection;
  nextAction: string | null;
  senders: CrmComposioSender[];
};

export type CrmTag = {
  color?: string | undefined;
  emoji?: string | null | undefined;
  id: string;
  name: string;
  sortOrder?: number | undefined;
};

export type CrmConversationCycleQuery = {
  archived?: boolean;
  assigneeId?: string;
  connectionId?: CrmConnectionId;
  filter?: CrmConversationCycleFilter;
  humanAttendanceState?: CrmHumanAttendanceState;
  leadId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  cycleId?: CrmConversationCycleId;
  status?: CrmConversationCycleStatus;
  tagIds?: string[];
  unreadOnly?: boolean;
};

export type CrmConversationCycleCountsQuery = Omit<
  CrmConversationCycleQuery,
  "assigneeId" | "limit" | "offset" | "cycleId"
>;

export type CrmAssignConversationCycleInput = {
  assignedUserId: string | null;
  commandId: string;
};

export type CrmInterventionInput = {
  commandId: string;
  enabled: boolean;
};

export type CrmConversationCycleCommandInput = {
  commandId: string;
};

export type CrmConversationCycleCommandResult = {
  result: "already_applied" | "applied" | "superseded";
  cycle: CrmConversationCycle;
};

export type CrmConclusionInput =
  | {
      commandId: string;
      outcome: "follow_up";
      reminder?: { dueAt: string };
    }
  | {
      commandId: string;
      note?: string;
      outcome: "lost";
      reason: CrmLossReason;
    };

export type CrmLossReason =
  | "bought_elsewhere"
  | "financing_not_approved"
  | "invalid_contact"
  | "no_longer_interested"
  | "no_response"
  | "other"
  | "price"
  | "trade_in_valuation"
  | "vehicle_unavailable";

export type CrmMessageQuery = {
  connectionId?: CrmConnectionId;
  limit?: number;
  offset?: number;
};

export type CrmSendTextInput = {
  idempotencyKey?: string;
  replyToMessageId?: string;
  cycleId: string;
  text: string;
};

export type CrmSendReactionInput = {
  reaction: string;
};

export type CrmSendMediaType = "audio" | "document" | "image" | "video";

export type CrmSendMediaInput = {
  base64: string;
  caption?: string;
  fileName?: string;
  idempotencyKey?: string;
  mediaType: CrmSendMediaType;
  mimeType?: string;
  cycleId: string;
};

export type * from "./crmConversationExtraTypes";
