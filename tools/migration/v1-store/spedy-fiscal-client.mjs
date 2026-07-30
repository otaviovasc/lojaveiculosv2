import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { json } from "./common.mjs";
import { log } from "./log.mjs";

const DEFAULT_REQUEST_ATTEMPTS = 3;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export async function listSpedyInvoices(env, companyApiKey, collection) {
  const rows = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await spedyRequest(
      env,
      companyApiKey,
      `${collection}?page=${page}&pageSize=100`,
    );
    const pageRows = Array.isArray(result)
      ? result
      : Array.isArray(result.items)
        ? result.items
        : [];
    rows.push(...pageRows.map(json));
    if (Array.isArray(result) || !result.hasNext) break;
  }
  return rows;
}

export async function ensureSpedyWebhook(env) {
  const webhookUrl = env.SPEDY_WEBHOOK_URL;
  const listed = await spedyRequest(env, env.SPEDY_OWNER_API_KEY, "webhooks");
  const rows = Array.isArray(listed) ? listed : (listed.items ?? []);
  const exists = rows.some(
    (row) => row?.url === webhookUrl && row?.event === "invoice.status_changed",
  );
  if (exists) return true;
  await spedyRequest(env, env.SPEDY_OWNER_API_KEY, "webhooks", {
    body: { event: "invoice.status_changed", url: webhookUrl },
    method: "POST",
  });
  return true;
}

export async function spedyRequest(env, apiKey, path, options = {}) {
  const attempts = options.attempts ?? DEFAULT_REQUEST_ATTEMPTS;
  const requestPath = path.split("?")[0];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(toUrl(env.SPEDY_API_URL, path), {
        body: options.body ? JSON.stringify(options.body) : undefined,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          "X-Api-Key": apiKey,
        },
        method: options.method ?? "GET",
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      const text = await response.text();
      const payload = text ? parseJson(text) : {};
      if (response.ok) return payload;

      const error = providerRequestError(
        `Spedy migration request failed (${response.status}) for ${requestPath}.`,
        `spedy_http_${response.status}`,
        RETRYABLE_HTTP_STATUSES.has(response.status),
      );
      if (!error.retryable || attempt === attempts) throw error;
      await waitBeforeRetry(
        requestPath,
        error.code,
        attempt,
        attempts,
        options,
      );
    } catch (error) {
      const normalized = normalizeProviderError(error, requestPath);
      if (!normalized.retryable || attempt === attempts) throw normalized;
      await waitBeforeRetry(
        requestPath,
        normalized.code,
        attempt,
        attempts,
        options,
      );
    }
  }
  throw providerRequestError(
    `Spedy migration request exhausted all attempts for ${requestPath}.`,
    "spedy_provider_unavailable",
    true,
  );
}

export function isTransientSpedyError(error) {
  return error?.retryable === true;
}

export function encryptSpedyCredential(value, encodedKey) {
  const key = decodeEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "fiscal:v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSpedyCredential(ciphertext, encodedKey) {
  try {
    const [namespace, iv, tag, encrypted] = String(ciphertext).split(".");
    if (
      namespace !== "fiscal:v1" ||
      iv === undefined ||
      tag === undefined ||
      encrypted === undefined
    ) {
      throw new Error("invalid payload");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      decodeEncryptionKey(encodedKey),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new Error("Stored fiscal credential cannot be decrypted.", {
      cause: error,
    });
  }
}

export function latestCertificateExpiration(certificates, legacy) {
  const rows = Array.isArray(certificates)
    ? certificates
    : Array.isArray(certificates.items)
      ? certificates.items
      : [];
  const dates = [
    ...rows.map((row) => dateValue(row.expirationAt)),
    dateValue(legacy.certificateExpiryDate),
  ].filter(Boolean);
  return dates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

export function sanitizeProviderObject(value) {
  if (Array.isArray(value)) return value.map(sanitizeProviderValue);
  const source = json(value);
  return Object.fromEntries(
    Object.entries(source)
      .filter(
        ([key]) =>
          !/(api.?key|password|secret|token|certificateFile)/i.test(key),
      )
      .map(([key, nested]) => [key, sanitizeProviderValue(nested)]),
  );
}

export function requireSpedyEnvironment(env, names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(
      `Fiscal migration requires environment variables: ${missing.join(", ")}`,
    );
  }
}

function sanitizeProviderValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeProviderValue);
  if (value && typeof value === "object") return sanitizeProviderObject(value);
  return value;
}

function decodeEncryptionKey(value) {
  const raw = String(value ?? "").trim();
  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "FISCAL_CREDENTIAL_ENCRYPTION_KEY must encode exactly 32 bytes.",
    );
  }
  return key;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toUrl(base, path) {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).href;
}

function normalizeProviderError(error, requestPath) {
  if (typeof error?.retryable === "boolean") return error;
  const networkCode = errorCode(error);
  const code = mapNetworkErrorCode(networkCode);
  return providerRequestError(
    `Spedy is unavailable for ${requestPath} (${networkCode || "network_error"}).`,
    code,
    RETRYABLE_NETWORK_CODES.has(networkCode),
    error,
  );
}

function errorCode(error) {
  return String(error?.code ?? error?.cause?.code ?? "")
    .trim()
    .toUpperCase();
}

function mapNetworkErrorCode(code) {
  if (["EAI_AGAIN", "ENOTFOUND"].includes(code)) return "spedy_dns_unavailable";
  if (
    [
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
    ].includes(code)
  )
    return "spedy_timeout";
  if (["ECONNRESET", "UND_ERR_SOCKET"].includes(code))
    return "spedy_connection_reset";
  return "spedy_provider_unavailable";
}

function providerRequestError(message, code, retryable, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    code,
    retryable,
  });
}

async function waitBeforeRetry(requestPath, code, attempt, attempts, options) {
  const delayMs =
    options.retryDelayMs ?? Math.min(250 * 2 ** (attempt - 1), 1_000);
  log(
    `  Fiscal: Spedy ${requestPath} attempt ${attempt}/${attempts} failed (${code}); retrying in ${(delayMs / 1_000).toFixed(1)}s...`,
  );
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}
