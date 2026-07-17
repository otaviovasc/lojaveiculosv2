import type {
  CrmWhatsappConfigureWebhooksInput,
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappWebhookConfigResult,
} from "../../domains/crm/ports/crmWhatsappGateway.js";
import type { ZapiWebhookEndpointType } from "../../domains/crm/whatsapp/whatsappWebhookEndpoints.js";
import {
  buildInstanceUrl,
  summarize,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

/**
 * Maps each webhook route type this API exposes to the matching ZAPI
 * "update-webhook-*" endpoint. ZAPI keeps a distinct webhook slot per event,
 * so each event type is registered against its own route.
 * See https://developer.z-api.io/en/webhooks/introduction
 */
const ZAPI_WEBHOOK_PATHS: Record<ZapiWebhookEndpointType, string> = {
  "chat-presence": "update-webhook-chat-presence",
  connected: "update-webhook-connected",
  delivery: "update-webhook-delivery",
  disconnected: "update-webhook-disconnected",
  received: "update-webhook-received",
  status: "update-webhook-message-status",
};

export async function configureZapiWebhooks(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappConfigureWebhooksInput,
): Promise<CrmWhatsappConfigureWebhooksResult> {
  const instanceUrl = buildInstanceUrl(credentials);
  const results: CrmWhatsappWebhookConfigResult[] = [];

  for (const webhook of input.webhooks) {
    results.push(
      await registerZapiWebhook(
        instanceUrl,
        credentials,
        fetchImpl,
        webhook.type,
        webhook.url,
      ),
    );
  }

  return { results };
}

async function registerZapiWebhook(
  instanceUrl: string,
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  type: string,
  url: string,
): Promise<CrmWhatsappWebhookConfigResult> {
  const path = ZAPI_WEBHOOK_PATHS[type as ZapiWebhookEndpointType];
  if (!path) {
    return {
      error: `Unsupported ZAPI webhook type: ${type}`,
      ok: false,
      status: null,
      type,
      url,
    };
  }

  try {
    const response = await fetchImpl(`${instanceUrl}/${path}`, {
      body: JSON.stringify({ value: url }),
      headers: {
        Accept: "application/json",
        "Client-Token": credentials.clientToken,
        "Content-Type": "application/json",
      },
      method: "PUT",
    });
    const text = await response.text();
    return {
      error: response.ok
        ? null
        : `ZAPI ${path} failed with HTTP ${response.status}: ${summarize(text)}`,
      ok: response.ok,
      status: response.status,
      type,
      url,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unknown ZAPI webhook error.",
      ok: false,
      status: null,
      type,
      url,
    };
  }
}
