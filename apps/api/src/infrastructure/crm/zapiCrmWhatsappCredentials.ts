import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import { openSealedCrmConnectionCredential } from "./crmConnectionCredentialVault.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

export function resolveZapiCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
): ZapiCredentials {
  const envRefs = readEnvRefs(connection.credentialsRef);
  const stored = readStoredCredentials(connection, env);
  if (!stored) {
    throw new CrmMessagingGatewayError(
      "Z-API credentials are incomplete. Re-enter the instance ID, instance token, and client token.",
      409,
      undefined,
      "configuration_error",
    );
  }
  return {
    apiBaseUrl:
      readOptionalEnv(env, envRefs.apiBaseUrl) ??
      env.CRM_ZAPI_API_BASE_URL?.trim() ??
      "https://api.z-api.io",
    clientToken: stored.clientToken,
    instanceId: stored.instanceId,
    instanceToken: stored.instanceToken,
    requestTimeoutMs: readRequestTimeoutMs(env.CRM_ZAPI_REQUEST_TIMEOUT_MS),
  };
}

function readRequestTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 60_000)
    : 10_000;
}

function readEnvRefs(credentialsRef: Record<string, unknown>) {
  const envRefs = readRecord(credentialsRef.env);
  return {
    apiBaseUrl: readString(envRefs.apiBaseUrl),
  };
}

function readStoredCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedClientToken = readString(stored.clientToken);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  const clientToken = decryptIfSealed(
    connection,
    sealedClientToken,
    ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
    env,
  );
  const instanceId = decryptIfSealed(
    connection,
    sealedInstanceId,
    ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    env,
  );
  const instanceToken = decryptIfSealed(
    connection,
    sealedInstanceToken,
    ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    env,
  );
  if (
    sealedClientToken &&
    sealedInstanceId &&
    sealedInstanceToken &&
    (!clientToken || !instanceId || !instanceToken)
  ) {
    throw new CrmMessagingGatewayError(
      "Stored ZAPI credentials must use encrypted CRM credential storage",
      409,
      undefined,
      "configuration_error",
    );
  }
  return clientToken && instanceId && instanceToken
    ? { clientToken, instanceId, instanceToken }
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
      "Stored ZAPI credential could not be decrypted",
      409,
      undefined,
      "configuration_error",
    );
  }
}

function readOptionalEnv(
  env: Record<string, string | undefined>,
  envName: string | null,
) {
  return envName ? env[envName]?.trim() || null : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
