export type ZapiWebhookEndpointType =
  | "chat-presence"
  | "connected"
  | "delivery"
  | "disconnected"
  | "received"
  | "status";

export type WhatsappWebhookEndpointDescriptor = {
  label: string;
  type: ZapiWebhookEndpointType;
};

export type WhatsappWebhookEndpoint = WhatsappWebhookEndpointDescriptor & {
  url: string;
};

/**
 * Canonical list of ZAPI webhook events that this API exposes routes for.
 * Both the connection controller (to display URLs) and the auto-configure
 * flow (to register URLs on ZAPI) derive their endpoints from this list so
 * the two never drift apart.
 */
export const WHATSAPP_WEBHOOK_ENDPOINTS: readonly WhatsappWebhookEndpointDescriptor[] =
  [
    { label: "Mensagens recebidas", type: "received" },
    { label: "Entrega", type: "delivery" },
    { label: "Status de mensagem", type: "status" },
    { label: "Conectado", type: "connected" },
    { label: "Desconectado", type: "disconnected" },
    { label: "Presenca no chat", type: "chat-presence" },
  ];

export function resolveWebhookBaseUrl({
  basePath,
  requestOrigin,
  webhookUrl,
}: {
  basePath: string;
  requestOrigin: string;
  webhookUrl: string | null;
}): string {
  if (webhookUrl) {
    try {
      const configured = new URL(webhookUrl);
      const configuredPath = configured.pathname.replace(/\/+$/, "");
      return configuredPath
        ? `${configured.origin}${configuredPath}`
        : `${configured.origin}${basePath}`;
    } catch {
      return `${requestOrigin}${basePath}`;
    }
  }
  return `${requestOrigin}${basePath}`;
}

export function buildWebhookEndpointUrl({
  baseUrl,
  connectionId,
  token,
  type,
}: {
  baseUrl: string;
  connectionId: string;
  token?: string | null;
  type: ZapiWebhookEndpointType;
}): string {
  const url = `${baseUrl}/whatsapp/webhooks/zapi/${encodeURIComponent(
    connectionId,
  )}/${type}`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function buildWhatsappWebhookEndpoints({
  baseUrl,
  connectionId,
  token,
}: {
  baseUrl: string;
  connectionId: string;
  token?: string | null;
}): WhatsappWebhookEndpoint[] {
  return WHATSAPP_WEBHOOK_ENDPOINTS.map((endpoint) => ({
    ...endpoint,
    url: buildWebhookEndpointUrl({
      baseUrl,
      connectionId,
      token: token ?? null,
      type: endpoint.type,
    }),
  }));
}
