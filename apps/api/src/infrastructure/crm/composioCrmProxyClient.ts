import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  readRecord,
  readString,
  type ComposioCrmCredentials,
} from "./composioCrmMessagingGatewaySupport.js";

const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;

export type ComposioRetryOptions = {
  maxRetries?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type ComposioProxyInput = {
  body: Record<string, unknown>;
  endpoint: string;
};

type ProxyEnvelope = {
  data: Record<string, unknown>;
  headers: Record<string, unknown>;
  status: number;
};

export async function executeComposioProxy(
  credentials: ComposioCrmCredentials,
  input: ComposioProxyInput,
  fetchImpl: typeof fetch,
  retryOptions: ComposioRetryOptions = {},
): Promise<Record<string, unknown>> {
  const maxRetries = Math.max(
    0,
    retryOptions.maxRetries ?? DEFAULT_MAX_RETRIES,
  );
  const sleep = retryOptions.sleep ?? defaultSleep;
  const now = retryOptions.now ?? Date.now;
  let retryCount = 0;

  while (true) {
    const result = await makeProxyRequest(credentials, input, fetchImpl);
    const retryAfterSeconds = readRetryAfterSeconds(result.headers, now());

    if (result.status !== 429 || retryCount >= maxRetries) {
      assertSuccessfulProxyResponse(result, retryAfterSeconds);
      return result.data;
    }

    retryCount += 1;
    const delayMs = Math.min(
      Math.max(
        BASE_DELAY_MS,
        (retryAfterSeconds ?? 2 ** (retryCount - 1)) * 1_000,
      ),
      MAX_DELAY_MS,
    );
    await sleep(delayMs);
  }
}

async function makeProxyRequest(
  credentials: ComposioCrmCredentials,
  input: ComposioProxyInput,
  fetchImpl: typeof fetch,
): Promise<ProxyEnvelope> {
  const { payload, response } = await fetchComposio(
    credentials,
    `${credentials.apiBaseUrl}/api/v3.1/tools/execute/proxy`,
    {
      body: JSON.stringify({
        body: input.body,
        connected_account_id: credentials.connectedAccountId,
        endpoint: input.endpoint,
        method: "POST",
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": credentials.apiKey,
      },
      method: "POST",
    },
    fetchImpl,
  );

  const upstreamStatus = readNumber(payload.status);
  return {
    data: readRecord(payload.data),
    headers:
      upstreamStatus === null
        ? headersToRecord(response.headers)
        : readRecord(payload.headers),
    status: upstreamStatus ?? response.status,
  };
}

export async function fetchComposio(
  credentials: ComposioCrmCredentials,
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<{ payload: Record<string, unknown>; response: Response }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    credentials.requestTimeoutMs,
  );
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    const payload = parseJson(await response.text());
    return { payload, response };
  } catch {
    throw new CrmMessagingGatewayError(
      controller.signal.aborted
        ? "Composio request timed out"
        : "Composio request failed before receiving a response",
      502,
      undefined,
      controller.signal.aborted ? "timeout" : "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function assertSuccessfulProxyResponse(
  result: ProxyEnvelope,
  retryAfterSeconds: number | undefined,
) {
  if (result.status >= 200 && result.status < 300) return;
  if (result.status === 429) {
    throw new CrmMessagingGatewayError(
      "Composio or Meta rate limit exhausted",
      429,
      retryAfterSeconds ?? 1,
    );
  }

  throw new CrmMessagingGatewayError(
    `Composio proxy failed with HTTP ${result.status}`,
    502,
    undefined,
    result.status >= 500 ? "provider_unavailable" : "provider_rejected",
  );
}

function readRetryAfterSeconds(
  headers: Record<string, unknown>,
  nowMs: number,
): number | undefined {
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "retry-after",
  );
  const value = readString(match?.[1]);
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }

  const retryAtMs = Date.parse(value);
  return Number.isFinite(retryAtMs)
    ? Math.max(1, Math.ceil((retryAtMs - nowMs) / 1_000))
    : undefined;
}

function parseJson(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    return readRecord(JSON.parse(text));
  } catch {
    return {};
  }
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function headersToRecord(headers: Headers): Record<string, unknown> {
  return Object.fromEntries(headers.entries());
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
