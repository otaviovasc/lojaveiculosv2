/** Server-owned vocabulary shared by the API and CRM frontend. */
export const crmChannels = ["whatsapp", "instagram", "olx_chat"] as const;
export type CrmChannel = (typeof crmChannels)[number];

export const crmProviders = ["meta_cloud", "zapi", "olx"] as const;
export type CrmProvider = (typeof crmProviders)[number];

export const crmConnectionStates = [
  "sandbox",
  "active",
  "paused",
  "disconnected",
  "error",
  "archived",
] as const;
export type CrmConnectionState = (typeof crmConnectionStates)[number];

export const crmConnectionCapabilities = [
  "inbound",
  "outbound",
  "text",
  "media",
  "templates",
  "scheduling",
  "conversation_start",
] as const;
export type CrmConnectionCapability =
  (typeof crmConnectionCapabilities)[number];

export type CrmConnectionReadiness = {
  ready: boolean;
  reasonCode:
    | "not_authorized"
    | "pending_webhook"
    | "disconnected"
    | "paused"
    | "provider_error"
    | "missing_capability"
    | "ready"
    | null;
  reason: string | null;
};

export type CrmChannelConnectionDto = {
  id: string;
  channel: CrmChannel;
  provider: CrmProvider;
  displayName: string;
  state: CrmConnectionState;
  readiness: CrmConnectionReadiness;
  capabilities: readonly CrmConnectionCapability[];
  isDefault: boolean;
};

export const externalBotActionRegistry = [
  "message.send_text",
  "message.send_media",
  "message.send_template",
  "conversation.summarize",
  "fact.record",
  "vehicle_interest.record",
  "handoff.request",
  "opportunity.open",
  "task.create",
  "appointment.create",
] as const;
export type ExternalBotAction = (typeof externalBotActionRegistry)[number];

export const externalBotModes = ["auto", "proposal", "disabled"] as const;
export type ExternalBotMode = (typeof externalBotModes)[number];

export type ExternalBotPolicyKey = {
  tenantId: string;
  storeId: string;
  channel: CrmChannel;
  action: ExternalBotAction;
};
