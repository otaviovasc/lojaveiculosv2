import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../ports/crmConnectionSetupProvider.js";
import { getCrmConnectionCredentialVault } from "../services/CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export async function openZapiWebhookSecret(
  connection: CrmConnection,
  ports: CrmServicePorts,
  slot: "current" | "pending" = "current",
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealed = readString(
    slot === "pending" ? stored.pendingWebhookSecret : stored.webhookSecret,
  );
  if (!sealed)
    throw new Error("Z-API webhook authentication is not configured.");
  return openSecret(connection, sealed, ports);
}

export async function openAcceptedZapiWebhookSecrets(
  connection: CrmConnection,
  ports: CrmServicePorts,
  now = new Date(),
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const candidates = [readString(stored.webhookSecret)];
  if (isUnexpired(stored.pendingWebhookSecretExpiresAt, now)) {
    candidates.push(readString(stored.pendingWebhookSecret));
  }
  if (isUnexpired(stored.previousWebhookSecretExpiresAt, now)) {
    candidates.push(readString(stored.previousWebhookSecret));
  }
  const unique = [
    ...new Set(candidates.filter((value): value is string => !!value)),
  ];
  if (unique.length === 0) {
    throw new Error("Z-API webhook authentication is not configured.");
  }
  return Promise.all(
    unique.map((sealed) => openSecret(connection, sealed, ports)),
  );
}

function openSecret(
  connection: CrmConnection,
  sealed: string,
  ports: CrmServicePorts,
) {
  return getCrmConnectionCredentialVault(ports).open({
    purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    sealed,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
}

function isUnexpired(value: unknown, now: Date) {
  const timestamp = readString(value);
  if (!timestamp) return false;
  const expiresAt = new Date(timestamp);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
