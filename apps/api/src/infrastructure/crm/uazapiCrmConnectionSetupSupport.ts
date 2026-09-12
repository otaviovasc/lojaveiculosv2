import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  buildUazapiUrl,
  parseJson,
  readString,
  redactUazapiTokenInText,
  type UazapiCredentials,
} from "./uazapiCrmWhatsappGatewaySupport.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;

export async function requestUazapiSetup(
  credentials: UazapiCredentials,
  path: string,
  init: { body?: Record<string, unknown>; method: "GET" | "POST" },
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(buildUazapiUrl(credentials, path), {
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        token: credentials.instanceToken,
      },
      method: init.method,
      redirect: "error",
      signal: controller.signal,
    });
    const payload = parseJson(await response.text());
    if (!response.ok) {
      throw new CrmConnectionSetupProviderError(
        redactUazapiTokenInText(
          `UAZAPI setup request was rejected with HTTP ${response.status}`,
          credentials.instanceToken,
        ),
        response.status === 429 ? "rate_limited" : "provider_rejected",
        response.status,
        response.status === 429 ? readRetryAfter(response.headers) : undefined,
      );
    }
    assertUazapiSetupAccepted(payload, credentials.instanceToken);
    return payload;
  } catch (error) {
    if (error instanceof CrmConnectionSetupProviderError) throw error;
    if (controller.signal.aborted) {
      throw new CrmConnectionSetupProviderError(
        "UAZAPI setup request timed out",
        "timeout",
      );
    }
    throw new CrmConnectionSetupProviderError(
      "UAZAPI setup request failed before receiving a response",
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Uazapi answers failures with HTTP 200 and `{ error: true, message }`, so
 * setup calls must inspect the body, not just the status code.
 */
export function assertUazapiSetupAccepted(
  payload: Record<string, unknown>,
  token?: string,
) {
  const error = payload.error;
  if (
    payload.success === false ||
    error === true ||
    (typeof error === "string" && error.trim()) ||
    (error !== null && typeof error === "object" && error !== undefined)
  ) {
    const message = readString(payload.message) ?? readString(payload.response);
    throw new CrmConnectionSetupProviderError(
      redactUazapiTokenInText(
        message
          ? `UAZAPI rejected the setup request: ${message}`
          : "UAZAPI rejected the setup request",
        token,
      ),
      "provider_rejected",
    );
  }
}

export function requireUazapiCredential(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new CrmConnectionSetupProviderError(
      `UAZAPI ${label} is required`,
      "configuration_error",
    );
  }
  return normalized;
}

export function readUazapiTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
}

function readRetryAfter(headers: Headers) {
  const value = Number(headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
}
