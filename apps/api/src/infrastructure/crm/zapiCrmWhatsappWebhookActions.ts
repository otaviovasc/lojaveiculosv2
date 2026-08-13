import type {
  CrmWhatsappConfigureWebhooksInput,
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappWebhookConfigResult,
} from "../../domains/crm/ports/crmWhatsappGateway.js";
import type { ZapiWebhookEndpointType } from "../../domains/crm/whatsapp/whatsappWebhookEndpoints.js";
import {
  buildInstanceUrl,
  fetchZapi,
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

const ZAPI_READBACK_FIELDS: Record<ZapiWebhookEndpointType, string> = {
  "chat-presence": "presenceChatCallbackUrl",
  connected: "connectedCallbackUrl",
  delivery: "deliveryCallbackUrl",
  disconnected: "disconnectedCallbackUrl",
  received: "receivedCallbackUrl",
  status: "messageStatusCallbackUrl",
};

export async function configureZapiWebhooks(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappConfigureWebhooksInput,
): Promise<CrmWhatsappConfigureWebhooksResult> {
  const instanceUrl = buildInstanceUrl(credentials);
  const acknowledgements: CrmWhatsappWebhookConfigResult[] = [];

  for (const webhook of input.webhooks) {
    let combinedResult: CrmWhatsappWebhookConfigResult | null = null;
    if (webhook.type === "received") {
      combinedResult = await registerZapiWebhookPath(
        instanceUrl,
        credentials,
        fetchImpl,
        "update-webhook-received-delivery",
        webhook.url,
      );
    }
    const result = await registerZapiWebhook(
      instanceUrl,
      credentials,
      fetchImpl,
      webhook,
    );
    acknowledgements.push(
      combinedResult && !combinedResult.ok
        ? {
            ...combinedResult,
            type: webhook.type,
          }
        : result,
    );
  }

  return {
    results: await verifyZapiWebhooks(
      instanceUrl,
      credentials,
      fetchImpl,
      acknowledgements,
    ),
  };
}

async function registerZapiWebhook(
  instanceUrl: string,
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  webhook: { type: string; url: string },
): Promise<CrmWhatsappWebhookConfigResult> {
  const { type, url } = webhook;
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

  return registerZapiWebhookPath(
    instanceUrl,
    credentials,
    fetchImpl,
    path,
    url,
    type,
  );
}

async function registerZapiWebhookPath(
  instanceUrl: string,
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  path: string,
  url: string,
  type = "received-combined",
): Promise<CrmWhatsappWebhookConfigResult> {
  try {
    const response = await fetchZapi(
      credentials,
      fetchImpl,
      `${instanceUrl}/${path}`,
      {
        body: JSON.stringify({ value: url }),
        headers: {
          Accept: "application/json",
          "Client-Token": credentials.clientToken,
          "Content-Type": "application/json",
        },
        method: "PUT",
      },
    );
    const responseText = await response.text();
    const acknowledged =
      response.ok && wasWebhookRegistrationAcknowledged(responseText);
    return {
      error: !response.ok
        ? `ZAPI webhook registration failed with HTTP ${response.status}`
        : acknowledged
          ? null
          : "ZAPI webhook registration was not acknowledged",
      ok: acknowledged,
      status: response.status,
      type,
      url,
    };
  } catch {
    return {
      error: "ZAPI webhook request failed",
      ok: false,
      status: null,
      type,
      url,
    };
  }
}

async function verifyZapiWebhooks(
  instanceUrl: string,
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  results: readonly CrmWhatsappWebhookConfigResult[],
): Promise<CrmWhatsappWebhookConfigResult[]> {
  let readback: Record<string, unknown> | null = null;
  try {
    const response = await fetchZapi(
      credentials,
      fetchImpl,
      `${instanceUrl}/me`,
      {
        headers: {
          Accept: "application/json",
          "Client-Token": credentials.clientToken,
        },
        method: "GET",
      },
    );
    if (response.ok) {
      const payload: unknown = await response.json();
      readback = isRecord(payload) ? payload : null;
    }
  } catch {
    // The sanitized per-slot result below is the operational evidence.
  }

  return results.map((result) => {
    const field = ZAPI_READBACK_FIELDS[result.type as ZapiWebhookEndpointType];
    if (!result.ok) {
      return { ...result, verified: false };
    }
    const verified = readback !== null && typeof field === "string";
    const matches = verified && readback?.[field] === result.url;
    if (!matches) {
      return {
        ...result,
        error: !verified
          ? "ZAPI webhook readback was unavailable"
          : "ZAPI webhook does not match provider readback",
        ok: false,
        verified,
      };
    }
    return { ...result, verified: true };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function wasWebhookRegistrationAcknowledged(responseText: string) {
  try {
    const payload = JSON.parse(responseText) as { value?: unknown };
    return payload.value === true;
  } catch {
    return false;
  }
}
