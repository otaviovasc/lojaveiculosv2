import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import { openSealedCrmConnectionCredential } from "./crmConnectionCredentialVault.js";
import {
  normalizeUazapiBaseUrl,
  UAZAPI_DEFAULT_BASE_URL,
  UAZAPI_DEFAULT_REQUEST_TIMEOUT_MS,
  UAZAPI_MAX_REQUEST_TIMEOUT_MS,
  type UazapiCredentials,
} from "./uazapiCrmWhatsappGatewaySupport.js";

export function resolveUazapiCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
): UazapiCredentials {
  const stored = readStoredCredentials(connection, env);
  if (!stored) {
    throw new CrmMessagingGatewayError(
      "UAZAPI credentials are incomplete. Re-enter the instance ID and instance token.",
      409,
      undefined,
      "configuration_error",
    );
  }
  return {
    apiBaseUrl: normalizeUazapiBaseUrl(
      stored.baseUrl ??
        env.CRM_UAZAPI_BASE_URL?.trim() ??
        UAZAPI_DEFAULT_BASE_URL,
    ),
    instanceId: stored.instanceId,
    instanceToken: stored.instanceToken,
    requestTimeoutMs: readRequestTimeoutMs(env.CRM_UAZAPI_REQUEST_TIMEOUT_MS),
  };
}

function readRequestTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, UAZAPI_MAX_REQUEST_TIMEOUT_MS)
    : UAZAPI_DEFAULT_REQUEST_TIMEOUT_MS;
}

function readStoredCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedBaseUrl =
    readString(stored.baseUrl) ?? readString(stored.apiBaseUrl);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  const baseUrl = decryptIfSealed(
    connection,
    sealedBaseUrl,
    UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
    env,
  );
  const instanceId = decryptIfSealed(
    connection,
    sealedInstanceId,
    UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    env,
  );
  const instanceToken = decryptIfSealed(
    connection,
    sealedInstanceToken,
    UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    env,
  );
  if (
    sealedInstanceId &&
    sealedInstanceToken &&
    (!instanceId || !instanceToken)
  ) {
    throw new CrmMessagingGatewayError(
      "Stored UAZAPI credentials must use encrypted CRM credential storage",
      409,
      undefined,
      "configuration_error",
    );
  }
  return instanceId && instanceToken
    ? { baseUrl, instanceId, instanceToken }
    : null;
}

function decryptIfSealed(
  connection: CrmConnection,
  sealed: string | null,
  purpose: string,
  env: Record<string, string | undefined>,
) {
  if (!sealed?.startsWith("crm:v1.")) return null;
  try {
    return openSealedCrmConnectionCredential(
      {
        purpose,
        sealed,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      },
      env,
    );
  } catch {
    throw new CrmMessagingGatewayError(
      "Stored UAZAPI credential could not be decrypted",
      409,
      undefined,
      "configuration_error",
    );
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
