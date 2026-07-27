import { createCipheriv, randomBytes } from "node:crypto";
import { json } from "./common.mjs";

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
  const response = await fetch(toUrl(env.SPEDY_API_URL, path), {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-Api-Key": apiKey,
    },
    method: options.method ?? "GET",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const payload = text ? parseJson(text) : {};
  if (!response.ok) {
    throw new Error(
      `Spedy migration request failed (${response.status}) for ${path.split("?")[0]}.`,
    );
  }
  return payload;
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
