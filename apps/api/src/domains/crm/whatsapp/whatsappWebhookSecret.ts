import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { getCrmConnectionCredentialVault } from "../services/CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export function createWhatsappWebhookSecretReader(config: {
  notConfiguredMessage: string;
  purpose: string;
}) {
  function openSecret(
    connection: CrmConnection,
    sealed: string,
    ports: CrmServicePorts,
  ) {
    return getCrmConnectionCredentialVault(ports).open({
      purpose: config.purpose,
      sealed,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
  }

  async function openWebhookSecret(
    connection: CrmConnection,
    ports: CrmServicePorts,
    slot: "current" | "pending" = "current",
  ) {
    const stored = readRecord(connection.credentialsRef.stored);
    const sealed = readString(
      slot === "pending" ? stored.pendingWebhookSecret : stored.webhookSecret,
    );
    if (!sealed) throw new Error(config.notConfiguredMessage);
    return openSecret(connection, sealed, ports);
  }

  async function openAcceptedWebhookSecrets(
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
      throw new Error(config.notConfiguredMessage);
    }
    return Promise.all(
      unique.map((sealed) => openSecret(connection, sealed, ports)),
    );
  }

  return { openAcceptedWebhookSecrets, openWebhookSecret };
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
