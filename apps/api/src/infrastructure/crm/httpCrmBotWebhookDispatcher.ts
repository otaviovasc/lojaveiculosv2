import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type {
  CrmBotWebhookDispatcher,
  DispatchCrmBotWebhookInput,
} from "../../domains/crm/ports/crmBotWebhookDispatcher.js";
import {
  isPublicHttpsWebhookUrl,
  isPublicInternetAddress,
} from "../../domains/crm/whatsapp/crmBotWebhookDestination.js";

type ResolvedAddress = { address: string; family: 4 | 6 };
type WebhookResolver = (
  hostname: string,
) => Promise<readonly { address: string; family: number }[]>;
type WebhookRequest = (input: {
  address: ResolvedAddress;
  body: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  url: URL;
}) => Promise<number>;

export type HttpCrmBotWebhookDispatcherOptions = {
  request?: WebhookRequest;
  resolve?: WebhookResolver;
};

export function createHttpCrmBotWebhookDispatcher(
  env: Record<string, string | undefined>,
  options: HttpCrmBotWebhookDispatcherOptions = {},
): CrmBotWebhookDispatcher {
  return {
    actionApiBaseUrl: resolveActionApiBaseUrl(env),
    dispatch: (input) =>
      dispatchCrmBotWebhook(
        input,
        options.request ?? sendPinnedHttpsWebhook,
        options.resolve ?? resolveHostname,
      ),
  };
}

async function dispatchCrmBotWebhook(
  input: DispatchCrmBotWebhookInput,
  request: WebhookRequest,
  resolve: WebhookResolver,
) {
  const body = JSON.stringify(input.payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "LojaVeiculos-CRM/2.0",
    "X-Idempotency-Key": input.idempotencyKey,
    "X-Webhook-Secret": input.webhookSecret,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const destination = await resolvePublicDestination(
        input.webhookUrl,
        resolve,
      );
      const status = await request({
        ...destination,
        body,
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (status >= 200 && status < 300) return;
      lastError = new Error(`Bot webhook failed with ${status}.`);
      if (status < 500) break;
    } catch (error) {
      lastError =
        error instanceof CrmBotWebhookDestinationError
          ? error
          : new Error("Bot webhook dispatch failed.");
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Bot webhook dispatch failed.");
}

async function resolvePublicDestination(
  value: string,
  resolve: WebhookResolver,
): Promise<{ address: ResolvedAddress; url: URL }> {
  if (!isPublicHttpsWebhookUrl(value)) {
    throw new CrmBotWebhookDestinationError();
  }
  const url = new URL(value);
  const hostname = normalizeHostname(url.hostname);
  const literalFamily = ipFamily(hostname);
  if (literalFamily !== null) {
    if (!isPublicInternetAddress(hostname)) {
      throw new CrmBotWebhookDestinationError();
    }
    return {
      address: { address: hostname, family: literalFamily },
      url,
    };
  }

  let addresses: readonly { address: string; family: number }[];
  try {
    addresses = await resolve(hostname);
  } catch {
    throw new CrmBotWebhookDestinationError();
  }
  const validated = addresses.map(({ address }) => ({
    address,
    family: ipFamily(address),
  }));
  if (
    validated.length === 0 ||
    validated.some(
      ({ address, family }) =>
        family === null || !isPublicInternetAddress(address),
    )
  ) {
    throw new CrmBotWebhookDestinationError();
  }
  const selected = validated[0];
  if (!selected || selected.family === null) {
    throw new CrmBotWebhookDestinationError();
  }
  return {
    address: { address: selected.address, family: selected.family },
    url,
  };
}

function sendPinnedHttpsWebhook(input: {
  address: ResolvedAddress;
  body: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  url: URL;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const hostname = normalizeHostname(input.url.hostname);
    const request = httpsRequest(
      input.url,
      {
        // A pooled socket could bypass the address selected for this attempt.
        agent: false,
        headers: input.headers,
        lookup: (_hostname, _options, callback) => {
          callback(null, input.address.address, input.address.family);
        },
        method: "POST",
        ...(isIP(hostname) ? {} : { servername: hostname }),
        signal: input.signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        response.resume();
        response.once("end", () => resolve(status));
      },
    );
    request.once("error", reject);
    request.end(input.body);
  });
}

async function resolveHostname(hostname: string) {
  return lookup(hostname, { all: true, verbatim: true });
}

function normalizeHostname(value: string) {
  return value.startsWith("[") && value.endsWith("]")
    ? value.slice(1, -1)
    : value;
}

function ipFamily(value: string): 4 | 6 | null {
  const family = isIP(value);
  return family === 4 || family === 6 ? family : null;
}

export class CrmBotWebhookDestinationError extends Error {
  constructor() {
    super("Bot webhook destination is not allowed.");
    this.name = "CrmBotWebhookDestinationError";
  }
}

function resolveActionApiBaseUrl(env: Record<string, string | undefined>) {
  const apiBase =
    trimTrailingSlash(env.API_BASE_URL) ?? "http://localhost:8787";
  return `${apiBase}/api/v1/crm/bot/actions`;
}

function trimTrailingSlash(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : undefined;
}
