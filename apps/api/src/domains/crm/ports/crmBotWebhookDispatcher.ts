import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnectionProvider } from "./crmConnectionRepository.js";
import type { CrmRoutingChannel } from "./crmRoutingPolicyRepository.js";

export type CrmBotWebhookEvent =
  | "connection_status_changed"
  | "intervention_ended"
  | "intervention_started"
  | "message";

export type CrmBotSenderOrigin =
  | "bot_api"
  | "customer"
  | "human_crm"
  | "human_whatsapp"
  | "system"
  | "unknown";

export type CrmInterventionSource =
  "admin" | "ai_request" | "auto" | "bot" | "seller_whatsapp";

export type CrmBotWebhookPayload = {
  actionsApi: {
    baseUrl: string;
    authentication: "X-Webhook-Secret";
  };
  chat?: {
    buyerName: string | null;
    phone: string;
    profilePhotoUrl: string | null;
    whatsappLid: string | null;
  };
  channel: CrmRoutingChannel;
  connection: {
    channel: CrmRoutingChannel;
    id: string;
    phone: string | null;
    provider: CrmConnectionProvider;
    status: string;
    uuid: string;
  };
  connectionId: string;
  connectionPhone: string | null;
  connectionUuid: string;
  event: CrmBotWebhookEvent;
  instanceName: string;
  intervention?: {
    active: boolean;
    attendanceState: "WAITING_HUMAN" | "IN_HUMAN_SERVICE" | null;
    durationSeconds: number | null;
    endedAt: string | null;
    id: string | null;
    messageCount: number;
    reason: string | null;
    source: string | null;
    startedAt: string | null;
    stateChangedAt: string | null;
    stateVersion: number | null;
    summary: string | null;
    triggeredBy: CrmInterventionSource;
  };
  message?: {
    content: string;
    direction: "inbound" | "outbound";
    fromMe: boolean;
    id: string;
    mediaType: string | null;
    mediaUrl: string | null;
    providerMessageId: string | null;
    senderOrigin: CrmBotSenderOrigin;
    timestamp: string;
    type: string;
    uuid: string;
    wasSentByApi: boolean;
  };
  previousStatus?: string | null;
  reason?: string | null;
  session?: {
    adAttribution?: {
      body: string | null;
      conversationType: string | null;
      detectedAt: string | null;
      detectionMethod: string | null;
      sourceApp: string | null;
      sourceId: string | null;
      sourceUrl: string | null;
      thumbnailUrl: string | null;
      title: string | null;
    };
    assignedUserId: string | null;
    humanAttendanceChangedAt: string | null;
    humanAttendanceState: "WAITING_HUMAN" | "IN_HUMAN_SERVICE" | null;
    humanAttendanceStateVersion: number | null;
    humanHandlingStartedAt: string | null;
    id: string;
    interventionId: string | null;
    isBotActive: boolean;
    leadId: string | null;
    messageCount: number;
    revision: number;
    status: string;
    tags: Array<{
      color: string;
      emoji: string | null;
      id: string;
      name: string;
    }>;
    uuid: string;
  };
  status?: string;
  timestamp: string;
};

export type DispatchCrmBotWebhookInput = {
  idempotencyKey: string;
  payload: CrmBotWebhookPayload;
  storeId: StoreId;
  tenantId: TenantId;
  webhookSecret: string;
  webhookUrl: string;
};

export type CrmBotWebhookDispatcher = {
  actionApiBaseUrl: string;
  dispatch: (input: DispatchCrmBotWebhookInput) => Promise<void>;
};

export function createNoopCrmBotWebhookDispatcher(): CrmBotWebhookDispatcher {
  return {
    actionApiBaseUrl:
      "http://localhost:8787/api/v1/crm/whatsapp/integrations/bot/actions",
    dispatch: async () => undefined,
  };
}
