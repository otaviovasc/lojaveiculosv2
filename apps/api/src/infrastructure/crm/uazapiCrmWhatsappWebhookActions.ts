import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
  CrmMessagingWebhookConfigResult,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  readRecord,
  readString,
  type UazapiCredentials,
} from "./uazapiCrmWhatsappGatewaySupport.js";

const UAZAPI_WEBHOOK_EVENTS = ["messages", "messages_update", "connection"];
const UAZAPI_WEBHOOK_EXCLUDE_MESSAGES = ["wasSentByApi"];

type UazapiWebhookEntry = {
  enabled?: boolean;
  events?: string[];
  id?: string;
  url?: string;
};

/**
 * Uazapi keeps a list of webhooks per instance: omitting `id` on POST
 * /webhook creates one; including the provider-generated `id` updates it.
 * The current entry is resolved by URL equality after stripping the auth
 * token query param from both sides, so a first-connect sync never tries to
 * update a synthetic id.
 */
export async function configureUazapiWebhooks(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingConfigureWebhooksInput,
): Promise<CrmMessagingConfigureWebhooksResult> {
  const results: CrmMessagingWebhookConfigResult[] = [];

  for (const webhook of input.webhooks) {
    results.push(await registerUazapiWebhook(credentials, fetchImpl, webhook));
  }

  return { results };
}

async function registerUazapiWebhook(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  webhook: { type: string; url: string },
): Promise<CrmMessagingWebhookConfigResult> {
  const { type, url } = webhook;
  try {
    const existing = await listUazapiWebhooks(credentials, fetchImpl);
    const match = existing.find(
      (entry) =>
        typeof entry.url === "string" &&
        stripWebhookAuthToken(entry.url) === stripWebhookAuthToken(url),
    );

    const response = await fetchUazapi(
      credentials,
      fetchImpl,
      buildUazapiUrl(credentials, "/webhook"),
      {
        body: JSON.stringify({
          url,
          events: UAZAPI_WEBHOOK_EVENTS,
          excludeMessages: UAZAPI_WEBHOOK_EXCLUDE_MESSAGES,
          ...(match?.id ? { id: match.id } : {}),
          enabled: true,
          addUrlEvents: false,
          addUrlTypesMessages: false,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          token: credentials.instanceToken,
        },
        method: "POST",
      },
    );
    const payload = parseJson(await response.text());
    if (!response.ok) {
      return {
        error: `UAZAPI webhook registration failed with HTTP ${response.status}`,
        ok: false,
        status: response.status,
        type,
        url,
      };
    }
    try {
      ensureUazapiOk(
        payload,
        "UAZAPI webhook registration",
        credentials.instanceToken,
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "UAZAPI webhook registration failed",
        ok: false,
        status: response.status,
        type,
        url,
      };
    }
    return {
      error: null,
      ok: true,
      status: response.status,
      type,
      url,
      verified: true,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "UAZAPI webhook request failed",
      ok: false,
      status: null,
      type,
      url,
    };
  }
}

async function listUazapiWebhooks(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
): Promise<UazapiWebhookEntry[]> {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/webhook"),
    {
      headers: {
        Accept: "application/json",
        token: credentials.instanceToken,
      },
      method: "GET",
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw uazapiWebhookListError(response.status);
  }
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(isWebhookEntry).map(toWebhookEntry);
    }
    const webhooks = readRecord(parsed).webhooks;
    return Array.isArray(webhooks)
      ? webhooks.filter(isWebhookEntry).map(toWebhookEntry)
      : [];
  } catch {
    return [];
  }
}

function isWebhookEntry(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toWebhookEntry(value: Record<string, unknown>): UazapiWebhookEntry {
  const events = Array.isArray(value.events)
    ? value.events.filter((event): event is string => typeof event === "string")
    : null;
  const id = readString(value.id);
  const url = readString(value.url);
  return {
    enabled: value.enabled === true,
    ...(events ? { events } : {}),
    ...(id ? { id } : {}),
    ...(url ? { url } : {}),
  };
}

function stripWebhookAuthToken(value: string) {
  try {
    const url = new URL(value);
    url.searchParams.delete("token");
    url.searchParams.delete("crmWebhookToken");
    return url.toString();
  } catch {
    return value;
  }
}

function uazapiWebhookListError(status: number) {
  return new Error(`UAZAPI webhook list failed with HTTP ${status}`);
}
