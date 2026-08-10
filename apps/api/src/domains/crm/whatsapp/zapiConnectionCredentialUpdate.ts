import { randomBytes } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
} from "../ports/crmConnectionSetupProvider.js";
import { getCrmConnectionCredentialVault } from "../services/CrmService/crmConnectionSetupSupport.js";
import {
  getCrmWhatsappGateway,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { WhatsappConnectionLiveStatus } from "./whatsappConnectionModels.js";
import { readZapiWebhookSetupState } from "./zapiWebhookSetupState.js";

export async function sealUpdatedZapiCredentials(
  input: { instanceId: string; instanceToken: string },
  current: CrmConnection,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const vault = getCrmConnectionCredentialVault(ports);
  const credentialScope = {
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const currentStored = readRecord(current.credentialsRef.stored);
  const existingWebhookSecret = readString(currentStored.webhookSecret);
  const [instanceId, instanceToken, webhookSecret] = await Promise.all([
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
    existingWebhookSecret
      ? Promise.resolve(existingWebhookSecret)
      : vault.seal({
          ...credentialScope,
          plaintext: randomBytes(32).toString("base64url"),
          purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
        }),
  ]);
  return { instanceId, instanceToken, webhookSecret };
}

export async function readConnectionLiveStatus(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<WhatsappConnectionLiveStatus> {
  const zapiConfigured =
    connection.provider !== "zapi" ||
    ("entitlements" in context &&
      Array.isArray(context.entitlements) &&
      context.entitlements.includes("crm_zapi") &&
      readZapiWebhookSetupState(connection.metadata)?.status === "configured");
  if (connection.status !== "active" || !zapiConfigured) {
    return {
      checkedAt: new Date(),
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected",
      smartphoneConnected: null,
    };
  }
  return getCrmWhatsappGateway(ports)
    .getConnectionStatus(connection)
    .catch((error: unknown): WhatsappConnectionLiveStatus => ({
      checkedAt: new Date(),
      connected: null,
      connectedPhone: null,
      errorMessage:
        error instanceof Error ? error.message : "Unknown provider error.",
      providerStatus: "error",
      smartphoneConnected: null,
    }));
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
