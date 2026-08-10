import {
  CrmConnectionSetupProviderError,
  type ComposioConnectedAccount,
  type ComposioWhatsappBusinessAccount,
  type ComposioWhatsappPhone,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;

export function readBusinessAccounts(
  payload: unknown,
): ComposioWhatsappBusinessAccount[] {
  const accounts = readItems(payload, [
    "business_accounts",
    "data",
    "items",
  ]).flatMap((item) => {
    const record = readRecord(item);
    const id = readString(record.id);
    return id ? [{ id, name: readString(record.name) }] : [];
  });
  if (!accounts.length) {
    throw invalidResponse(
      "Composio returned no readable WhatsApp WABA records",
    );
  }
  return accounts;
}

export function readPhones(
  payload: unknown,
  businessAccountId: string,
): ComposioWhatsappPhone[] {
  return readItems(payload, ["phone_numbers", "data", "items"]).flatMap(
    (item) => {
      const record = readRecord(item);
      const id = readString(record.id);
      return id
        ? [
            {
              businessAccountId,
              displayName: readString(record.verified_name),
              id,
              phone: readString(record.display_phone_number),
            },
          ]
        : [];
    },
  );
}

export function normalizeAccountStatus(
  status: string,
): ComposioConnectedAccount["status"] {
  if (status === "active" || status === "connected") return "active";
  if (["failed", "expired", "disabled", "revoked"].includes(status)) {
    return "failed";
  }
  return "pending";
}

export function requireAccountId(value: string) {
  const accountId = requireValue(value, "Composio connected account ID");
  if (!/^[a-z0-9_-]+$/iu.test(accountId)) {
    throw configurationError("Composio connected account ID is invalid");
  }
  return accountId;
}

export function requireValue(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw configurationError(`${label} is not configured`);
  return normalized;
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
}

export function configurationError(message: string) {
  return new CrmConnectionSetupProviderError(message, "configuration_error");
}

function readItems(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const record = readRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
    const nested = readRecord(candidate);
    if (Array.isArray(nested.data)) return nested.data;
  }
  return [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function invalidResponse(message: string) {
  return new CrmConnectionSetupProviderError(
    message,
    "invalid_provider_response",
  );
}
