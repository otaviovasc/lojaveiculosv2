import { Buffer } from "node:buffer";
import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  buildInstanceUrl,
  readString,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;

export async function requestZapiSetup<T>(
  credentials: ZapiCredentials,
  path: string,
  accept: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  readResponse: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${buildInstanceUrl(credentials)}${path}`,
      {
        headers: { Accept: accept, "Client-Token": credentials.clientToken },
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new CrmConnectionSetupProviderError(
        `Z-API setup request was rejected with HTTP ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_rejected",
        response.status,
        response.status === 429 ? readRetryAfter(response.headers) : undefined,
      );
    }
    return await readResponse(response);
  } catch (error) {
    if (error instanceof CrmConnectionSetupProviderError) throw error;
    if (controller.signal.aborted) {
      throw new CrmConnectionSetupProviderError(
        "Z-API setup request timed out",
        "timeout",
      );
    }
    throw new CrmConnectionSetupProviderError(
      "Z-API setup request failed before receiving a response",
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function readSetupResponse(response: Response) {
  return parseSetupPayload(await response.text());
}

export async function readQrResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.startsWith("image/")) {
    const bytes = Buffer.from(await response.arrayBuffer());
    const dataUri = normalizeRawQrImage(bytes.toString("base64"));
    const expectedMimeType = contentType.startsWith("image/png")
      ? "image/png"
      : contentType.startsWith("image/jpeg")
        ? "image/jpeg"
        : null;
    return {
      dataUri:
        expectedMimeType && dataUri?.startsWith(`data:${expectedMimeType};`)
          ? dataUri
          : null,
      payload: {} as Record<string, unknown>,
    };
  }
  return {
    dataUri: null,
    payload: parseSetupPayload(await response.text()),
  };
}

export function readQrDataUri(payload: Record<string, unknown>) {
  for (const candidate of collectStrings(payload)) {
    const dataUri = normalizeQrDataUri(candidate);
    if (dataUri) return dataUri;
  }
  return null;
}

export function readFirstString(
  payload: Record<string, unknown>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = payload[key];
    const stringValue = readString(value);
    if (stringValue) return stringValue;
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

export function readPairingCode(
  payload: Record<string, unknown>,
  keys: readonly string[],
) {
  const value = readFirstString(payload, keys);
  return value && /^[a-z0-9]{10}$/iu.test(value) ? value : null;
}

export function normalizeBrazilianPairingPhone(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+") && !trimmed.startsWith("+55")) return null;
  const digits = trimmed.replace(/\D/gu, "");
  const e164Digits =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits
      : digits.length === 10 || digits.length === 11
        ? `55${digits}`
        : null;
  if (!e164Digits || !/^55[1-9]{2}\d{8,9}$/u.test(e164Digits)) return null;
  return e164Digits;
}

export function assertProviderAccepted(payload: Record<string, unknown>) {
  const error = payload.error;
  if (
    payload.success === false ||
    error === true ||
    (typeof error === "string" && error.trim()) ||
    (error !== null && typeof error === "object")
  ) {
    throw new CrmConnectionSetupProviderError(
      "Z-API rejected the setup request",
      "provider_rejected",
    );
  }
}

export function requireCredential(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new CrmConnectionSetupProviderError(
      `Z-API ${label} is required`,
      "configuration_error",
    );
  }
  return normalized;
}

export function readTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
}

export function assertHttpsProviderUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return;
  } catch {
    // Mapped to the stable setup configuration error below.
  }
  throw new CrmConnectionSetupProviderError(
    "Z-API base URL must be HTTPS and contain no embedded credentials",
    "configuration_error",
  );
}

function parseSetupPayload(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return typeof parsed === "string" || typeof parsed === "number"
      ? { value: String(parsed) }
      : {};
  } catch {
    return { value: trimmed };
  }
}

function normalizeQrDataUri(value: string) {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/isu.exec(value.trim());
  if (!match) return normalizeRawQrImage(value);
  const mimeType =
    match[1]?.toLowerCase() === "png" ? "image/png" : "image/jpeg";
  const encoded = (match[2] ?? "").replace(/\s+/gu, "");
  if (!encoded || !/^[a-z0-9+/]+={0,2}$/iu.test(encoded)) return null;
  const normalized = normalizeRawQrImage(encoded);
  return normalized?.startsWith(`data:${mimeType};`) ? normalized : null;
}

function normalizeRawQrImage(value: string) {
  const encoded = value.trim().replace(/\s+/gu, "");
  if (encoded.length < 12 || !/^[a-z0-9+/]+={0,2}$/iu.test(encoded)) {
    return null;
  }
  const bytes = Buffer.from(encoded, "base64");
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  if (!isPng && !isJpeg) return null;
  return `data:${isPng ? "image/png" : "image/jpeg"};base64,${encoded}`;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  return Object.values(value).flatMap(collectStrings);
}

function readRetryAfter(headers: Headers) {
  const value = Number(headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
}
