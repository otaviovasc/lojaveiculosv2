import {
  SpedyGatewayConfigurationError,
  SpedyGatewayHttpError,
} from "./spedyErrors.js";

export type JsonRecord = Record<string, unknown>;
export type Fetcher = typeof fetch;

const REQUEST_TIMEOUT_MS = 30_000;
const SECRET_KEYS = new Set([
  "apicredentials",
  "apikey",
  "certificatepassword",
  "csc",
  "password",
  "secret",
  "token",
  "tokenid",
  "username",
]);

export async function listAllCompanies(fetcher: Fetcher, env: JsonRecord) {
  const companies: JsonRecord[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await ownerRequest(
      fetcher,
      env,
      "GET",
      `companies?page=${page}&pageSize=100`,
    );
    companies.push(...arrayOfRecords(result.items));
    if (!result.hasNext) break;
  }
  return companies;
}

export function ownerRequest(
  fetcher: Fetcher,
  env: JsonRecord,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
) {
  return request(
    fetcher,
    env,
    requireEnv(env, "SPEDY_OWNER_API_KEY"),
    method,
    path,
    body,
  );
}

export function companyRequest(
  fetcher: Fetcher,
  env: JsonRecord,
  apiKey: string,
  method: "GET",
  path: string,
) {
  return request(fetcher, env, apiKey, method, path);
}

export async function ownerUpload(
  fetcher: Fetcher,
  env: JsonRecord,
  path: string,
  body: FormData,
) {
  const response = await fetcher(
    toUrl(requireEnv(env, "SPEDY_API_URL"), path),
    {
      body,
      headers: { "X-Api-Key": requireEnv(env, "SPEDY_OWNER_API_KEY") },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  return readResponse(response);
}

export function sanitizeProviderRecord(value: JsonRecord): JsonRecord {
  return redactSecrets(structuredClone(value)) as JsonRecord;
}

export function requireEnv(env: JsonRecord, key: string) {
  const value = stringValue(env[key]);
  if (!value) throw new SpedyGatewayConfigurationError([key]);
  return value;
}

export function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.map(toRecord) : [];
}

export function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function digits(value: string | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

export function dateValue(value: unknown) {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

async function request(
  fetcher: Fetcher,
  env: JsonRecord,
  apiKey: string,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
) {
  const response = await fetcher(
    toUrl(requireEnv(env, "SPEDY_API_URL"), path),
    {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-Api-Key": apiKey,
      },
      method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  return readResponse(response);
}

async function readResponse(response: Response): Promise<JsonRecord> {
  const text = await response.text();
  let payload: JsonRecord = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as JsonRecord;
    } else if (Array.isArray(parsed)) {
      payload = { items: parsed };
    }
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    throw new SpedyGatewayHttpError(
      stringValue(payload.message) ??
        `Spedy request failed with HTTP ${response.status}`,
      response.status,
    );
  }
  return payload;
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter(([key]) => !SECRET_KEYS.has(key.toLowerCase()))
      .map(([key, nested]) => [key, redactSecrets(nested)]),
  );
}

function toUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}
