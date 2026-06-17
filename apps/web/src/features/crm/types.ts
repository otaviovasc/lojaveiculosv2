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
