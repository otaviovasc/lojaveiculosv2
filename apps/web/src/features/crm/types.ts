export const CRM_REQUEST_BRIDGE_REFRESH = "CRM_REQUEST_BRIDGE_REFRESH";
export const CRM_BRIDGE_TOKEN_REFRESH = "CRM_BRIDGE_TOKEN_REFRESH";

export type CrmBridgeEventType =
  | typeof CRM_REQUEST_BRIDGE_REFRESH
  | typeof CRM_BRIDGE_TOKEN_REFRESH;

export type CrmRuntimeMode = "embedded" | "standalone";

export type CrmAgent = {
  email: string;
  id: string;
  name: string;
  role: "owner" | "agent";
};

export type RepassesCrmAgent = {
  connectionId: number;
  email: string;
  id: number;
  name: string;
  role: string;
  seeUnassignedChats: boolean;
  userId?: number | null;
  uuid: string;
};

export type RepassesCrmUser = {
  companyName?: string;
  connectionId: number | null;
  id: number;
  name: string;
  role: string;
  uuid: string;
};

export type RepassesCrmConnection = {
  id: number;
  mode: string;
  status: string;
  uuid: string;
};

export type CrmBridgeResponse = {
  accessToken: string;
  agent?: RepassesCrmAgent;
  connection: RepassesCrmConnection | null;
  expiresIn: number;
  user: RepassesCrmUser;
};

export type CrmAgentLoginResponse = {
  accessToken: string;
  agent: RepassesCrmAgent;
  expiresIn: number;
  user: RepassesCrmUser;
};

export type CrmBootstrapState = {
  agent: CrmAgent | null;
  bridgeError: string | null;
  bridgeToken: string | null;
  isBridgeLoading: boolean;
  isReady: boolean;
  mode: CrmRuntimeMode;
};

export type CrmAuthState = {
  accessToken: string | null;
  agent: CrmAgent | null;
};

export type CrmRequestHeaders = {
  Authorization?: `Bearer ${string}`;
  "x-crm-agent-id"?: string;
};

export type CrmSessionQuery = {
  agentId?: number;
  connectionId?: number;
  filterByAgent?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  sessionId?: number;
  tagIds?: number[];
  tagMatchMode?: "all" | "any";
};

export type CrmSession = {
  buyerName?: string;
  buyerPhone?: string;
  channel?: "WHATSAPP" | "OLX_CHAT" | "WEB_CHAT";
  id: number;
  lastMessage?: {
    content?: string;
    createdAt?: string;
    id: number;
    senderType?: string;
    text?: string;
  };
  sessionTags?: Array<{ id: number; name: string }>;
  status?:
    | "ACTIVE"
    | "COMPLETED"
    | "EXPIRED"
    | "HUMAN_TAKEOVER"
    | "MINIBOT_ACTIVE";
  unreadCount?: number;
  uuid: string;
};

export type CrmMessage = {
  channel: "WHATSAPP" | "OLX_CHAT" | "WEB_CHAT";
  channelMessageId?: string;
  channelMetadata?: Record<string, unknown>;
  content: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId?: string;
  id: number;
  mediaType?: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  providerTimestamp?: string;
  senderType: "AI" | "CUSTOMER" | "HUMAN";
  status: "DELIVERED" | "FAILED" | "PENDING" | "READ" | "SENT";
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
    | "VIDEO";
  uuid: string;
};

export type CrmMessageQuery = {
  limit?: number;
  offset?: number;
};

export type CrmSseTicket = {
  expiresAt: string;
  ticket: string;
};

export type CrmSseEventType =
  | "message"
  | "message_deleted"
  | "message_status"
  | "new_session"
  | "replay_gap"
  | "session"
  | "session_assignment"
  | "session_read"
  | "session_status"
  | "session_updated";

export type CrmSseEvent<T = unknown> = {
  connectionId: number;
  data: T;
  id?: string;
  timestamp: string;
  type: CrmSseEventType;
};

export type CrmSseStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "reconnecting";

export type CrmConversation = {
  agentId: string | null;
  contactName: string;
  id: string;
  lastMessage: string;
  status: "open" | "waiting" | "closed";
  unreadCount: number;
  vehicle: string;
};
