import { randomBytes } from "node:crypto";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../services/CrmService/crmConnectionSetupSupport.js";
import {
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
} from "../ports/crmConnectionSetupProvider.js";
import type { CreateCrmChannelConnectionInput } from "../channelConnections/connectionCreation.js";

export async function sealZapiCredentials(
  input: Extract<CreateCrmChannelConnectionInput, { provider: "zapi" }>,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  currentCredentialsRef: Record<string, unknown> = {},
  options: { reuseWebhookSecret?: boolean } = {},
) {
  const vault = getCrmConnectionCredentialVault(ports);
  const credentialScope = {
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const currentStored = readRecord(currentCredentialsRef.stored);
  const currentWebhookSecret = readString(currentStored.webhookSecret);
  const [clientToken, instanceId, instanceToken, webhookSecret] =
    await Promise.all([
      vault.seal({
        ...credentialScope,
        plaintext: input.clientToken,
        purpose: ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
      }),
      vault.seal({
        ...credentialScope,
        plaintext: input.instanceId,
        purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
      }),
      vault.seal({
        ...credentialScope,
        plaintext: input.instanceToken,
        purpose: ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
      }),
      currentWebhookSecret && options.reuseWebhookSecret !== false
        ? Promise.resolve(currentWebhookSecret)
        : vault.seal({
            ...credentialScope,
            plaintext: randomBytes(32).toString("base64url"),
            purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
          }),
    ]);
  return {
    mode: "stored",
    stored: {
      clientToken,
      instanceId,
      instanceToken,
      webhookSecret,
    },
  };
}

export function readZapiCredentialState(
  credentialsRef: Record<string, unknown>,
) {
  const stored = readRecord(credentialsRef.stored);
  const clientToken = readString(stored.clientToken);
  const instanceId = readString(stored.instanceId);
  const instanceToken = readString(stored.instanceToken);
  if (clientToken && instanceId && instanceToken) return "configured" as const;
  if (clientToken || instanceId || instanceToken) return "partial" as const;
  return "unconfigured" as const;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
