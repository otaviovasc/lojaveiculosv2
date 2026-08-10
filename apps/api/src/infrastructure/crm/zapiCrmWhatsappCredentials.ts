import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { openSealedCrmConnectionCredential } from "./crmConnectionCredentialVault.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

export function resolveZapiCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
): ZapiCredentials {
  const envRefs = readEnvRefs(connection.credentialsRef);
  const stored = readStoredCredentials(connection, env);
  if (stored) {
    return {
      apiBaseUrl:
        readOptionalEnv(env, envRefs.apiBaseUrl) ??
        env.CRM_ZAPI_API_BASE_URL?.trim() ??
        "https://api.z-api.io",
      clientToken:
        readOptionalEnv(env, envRefs.clientToken) ??
        env.CRM_ZAPI_CLIENT_TOKEN?.trim() ??
        env.CRM_ZAPI_TEST_CLIENT_TOKEN?.trim() ??
        env.ZAPI_CLIENT_TOKEN?.trim() ??
        readRequiredEnv(env, envRefs.clientToken, "clientToken"),
      instanceId: stored.instanceId,
      instanceToken: stored.instanceToken,
      requestTimeoutMs: readRequestTimeoutMs(env.CRM_ZAPI_REQUEST_TIMEOUT_MS),
    };
  }
  return {
    apiBaseUrl: readRequiredEnv(env, envRefs.apiBaseUrl, "apiBaseUrl"),
    clientToken: readRequiredEnv(env, envRefs.clientToken, "clientToken"),
    instanceId: readRequiredEnv(env, envRefs.instanceId, "instanceId"),
    instanceToken: readRequiredEnv(env, envRefs.instanceToken, "instanceToken"),
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
    clientToken: readString(envRefs.clientToken),
    instanceId: readString(envRefs.instanceId),
    instanceToken: readString(envRefs.instanceToken),
  };
}

function readStoredCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
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
    sealedInstanceId &&
    sealedInstanceToken &&
    (!instanceId || !instanceToken)
  ) {
    throw new CrmWhatsappGatewayError(
      "Stored ZAPI credentials must use encrypted CRM credential storage",
    );
  }
  return instanceId && instanceToken ? { instanceId, instanceToken } : null;
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
    throw new CrmWhatsappGatewayError(
      "Stored ZAPI instance token could not be decrypted",
    );
  }
}

function readOptionalEnv(
  env: Record<string, string | undefined>,
  envName: string | null,
) {
  return envName ? env[envName]?.trim() || null : null;
}

function readRequiredEnv(
  env: Record<string, string | undefined>,
  envName: string | null,
  credentialName: string,
) {
  if (!envName) {
    throw new CrmWhatsappGatewayError(
      `ZAPI credential reference is missing: ${credentialName}`,
    );
  }
  const value = env[envName]?.trim();
  if (!value) {
    throw new CrmWhatsappGatewayError(
      `ZAPI credential env var is not configured: ${envName}`,
    );
  }
  return value;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
