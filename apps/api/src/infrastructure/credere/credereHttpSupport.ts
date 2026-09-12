import { FinancingProviderGatewayError } from "../../domains/financing/ports/financingProviderGateway.js";

export const CREDERE_API_ROOT = "https://app.meucredere.com.br/api/v1";
export const CREDERE_HTTP_TIMEOUT_MS = 20_000;
const MAX_RETRY_AFTER_SECONDS = 300;

export function fetchCredere(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
) {
  return fetchImpl(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(CREDERE_HTTP_TIMEOUT_MS),
  });
}

export function credereApiUrl(
  path: string,
  query?: Record<string, string>,
  apiRoot = CREDERE_API_ROOT,
) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new FinancingProviderGatewayError(
      "not_configured",
      "Credere gateway path is not allowlisted.",
      500,
    );
  }
  const url = new URL(`${apiRoot.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function bearerHeaders(token: string, credereStoreId?: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(credereStoreId ? { "Store-Id": credereStoreId } : {}),
  };
}

export async function parseSafeJson(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new FinancingProviderGatewayError(
      "invalid_response",
      "Credere returned an invalid JSON response.",
      502,
    );
  }
}

export function readString(value: unknown) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function retryAfterSeconds(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  const parsed = Number.isFinite(seconds)
    ? seconds
    : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(MAX_RETRY_AFTER_SECONDS, parsed));
}

export function providerError(response: Response) {
  const retryAfter = retryAfterSeconds(response.headers.get("retry-after"));
  if (response.status === 401 || response.status === 403) {
    return new FinancingProviderGatewayError(
      "unauthorized",
      "Credere account must be reconnected.",
      401,
    );
  }
  if (response.status === 429) {
    return new FinancingProviderGatewayError(
      "rate_limited",
      "Credere rate limit was reached.",
      429,
      retryAfter === null ? {} : { retryAfterSeconds: retryAfter },
      retryAfter,
    );
  }
  if (response.status >= 500) {
    return new FinancingProviderGatewayError(
      "unavailable",
      "Credere is unavailable.",
      503,
    );
  }
  return new FinancingProviderGatewayError(
    "invalid_response",
    "Credere rejected the request.",
    response.status,
  );
}

export function networkError(indeterminate: boolean) {
  return new FinancingProviderGatewayError(
    indeterminate ? "indeterminate" : "unavailable",
    indeterminate
      ? "Credere request outcome is indeterminate."
      : "Credere is unavailable.",
    indeterminate ? 202 : 503,
  );
}

export async function fetchWithReadRetry(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchCredere(fetchImpl, url, init);
      if (response.status < 500 || response.status === 501) return response;
      lastError = response;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Response) throw providerError(lastError);
  throw networkError(false);
}
