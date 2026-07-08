import {
  VehicleAiStudioProviderError,
  type VehicleAiStudioProviderErrorDetails,
  type VehicleAiStudioProviderPhase,
} from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";

export function authValue(header: string, scheme: string, apiKey: string) {
  return header.toLowerCase() === "authorization" && scheme
    ? `${scheme} ${apiKey}`
    : apiKey;
}

export function toUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function fetchWithTimeout(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  input: {
    phase: VehicleAiStudioProviderPhase;
    requestTimeoutMs: number;
  },
) {
  if (input.requestTimeoutMs <= 0) return fetch(url, init);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.requestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new VehicleAiStudioProviderError(
        `Hedra image ${input.phase} request timed out after ${input.requestTimeoutMs}ms.`,
        503,
        {
          ...safeUrlDetails(url),
          errorName: "AbortError",
          phase: input.phase,
          provider: "hedra",
          timeoutMs: input.requestTimeoutMs,
        },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createProviderHttpError(
  response: Response,
  input: {
    phase: VehicleAiStudioProviderPhase;
    url: string;
  },
) {
  const details = await readProviderResponseDetails(response, input);
  return new VehicleAiStudioProviderError(
    `Hedra image ${input.phase} failed with status ${response.status}.`,
    response.status === 401 || response.status === 403 ? 502 : 503,
    details,
  );
}

export function previewPayload(
  payload: unknown,
): Pick<VehicleAiStudioProviderErrorDetails, "providerResponseBody"> {
  return {
    providerResponseBody: sanitizeProviderBody(JSON.stringify(payload)),
  };
}

function readProviderResponseDetails(
  response: Response,
  input: {
    phase: VehicleAiStudioProviderPhase;
    url: string;
  },
): Promise<VehicleAiStudioProviderErrorDetails> {
  return response.text().then((body) => ({
    ...safeUrlDetails(input.url),
    phase: input.phase,
    provider: "hedra",
    providerResponseBody: sanitizeProviderBody(body),
    providerResponseContentType: response.headers.get("content-type") ?? "",
    providerStatus: response.status,
    providerStatusText: response.statusText,
  }));
}

function sanitizeProviderBody(body: string) {
  return body
    .slice(0, 2_000)
    .replace(/sk_[A-Za-z0-9_-]+/g, "[redacted-api-key]")
    .replace(/https?:\/\/[^\s"',}]+/g, "[redacted-url]")
    .replace(
      /("(?:api[_-]?key|token|authorization|secret)"\s*:\s*")[^"]+"/gi,
      '$1[redacted]"',
    );
}

function safeUrlDetails(url: string) {
  try {
    const parsed = new URL(url);
    return {
      urlHost: parsed.host,
      urlPath: parsed.pathname,
    };
  } catch {
    return {};
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
