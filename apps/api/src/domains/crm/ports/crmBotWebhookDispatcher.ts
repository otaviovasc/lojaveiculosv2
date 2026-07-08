import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type CrmBotWebhookEvent =
  | "connection_status_changed"
  | "intervention_ended"
  | "intervention_started"
  | "message";

export type CrmBotSenderOrigin =
  "bot_api" | "customer" | "human_crm" | "human_whatsapp" | "system";

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
  connection: {
    id: string;
    phone: string | null;
    provider: "zapi";
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
    durationSeconds: number | null;
    endedAt: string | null;
    messageCount: number;
    reason: string | null;
    startedAt: string | null;
    summary: string | null;
    triggeredBy: "bot" | "human" | "system";
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
    assignedUserId: string | null;
    id: string;
    isBotActive: boolean;
    leadId: string | null;
    messageCount: number;
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
