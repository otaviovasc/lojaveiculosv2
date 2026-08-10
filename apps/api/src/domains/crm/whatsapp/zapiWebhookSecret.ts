import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../ports/crmConnectionSetupProvider.js";
import { getCrmConnectionCredentialVault } from "../services/CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export async function openZapiWebhookSecret(
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealed = readString(stored.webhookSecret);
  if (!sealed)
    throw new Error("Z-API webhook authentication is not configured.");
  return getCrmConnectionCredentialVault(ports).open({
    purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    sealed,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
