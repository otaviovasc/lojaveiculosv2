import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmConnectionSetupProviderError,
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  type UazapiSetupCredentials,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  getCrmConnectionCredentialVault,
  getUazapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import { logCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { runUazapiWebhookSetupAttempt } from "./runUazapiWebhookSetupAttempt.js";
import type { RequestUazapiPairingQrInput } from "./uazapiPairingQr.js";
import {
  loadWhatsappSetupTarget,
  runWhatsappProviderOperation,
} from "./whatsappConnectionSetupShared.js";

const connectionPermission = "crm.messaging.connection.pair" as const;

/**
 * Pairing is already confirmed at the provider; webhook setup is retriable
 * through the configure route, so a setup failure here must not fail the
 * pairing response.
 */
export async function runPostPairingWebhookSetup(
  context: ServiceContext,
  connectionId: string,
  input: RequestUazapiPairingQrInput,
  ports: CrmServicePorts,
) {
  if (!input.webhookSetupTarget) return;
  try {
    await runUazapiWebhookSetupAttempt(
      context,
      { connectionId, ...input.webhookSetupTarget },
      ports,
    );
  } catch (error) {
    logCrmServiceEvent(context, "crm.provider.uazapi.webhooks.deferred", {
      connectionId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      operation: "configure_webhooks",
      provider: "uazapi",
    });
  }
}

export async function requestQrForDisconnectedInstance(
  credentials: UazapiSetupCredentials,
  ports: CrmServicePorts,
) {
  const provider = getUazapiConnectionSetupProvider(ports);
  await assertInstanceDisconnected(await provider.validateStatus(credentials));
  return provider.getQrCode(credentials);
}

export async function requestCodeForDisconnectedInstance(
  credentials: UazapiSetupCredentials,
  phone: string,
  ports: CrmServicePorts,
) {
  const provider = getUazapiConnectionSetupProvider(ports);
  await assertInstanceDisconnected(await provider.validateStatus(credentials));
  return provider.getPairingCode(credentials, phone);
}

function assertInstanceDisconnected(status: {
  connected: boolean;
  smartphoneConnected: boolean | null;
}) {
  if (!status.connected && status.smartphoneConnected !== true) return;
  throw new CrmConnectionSetupProviderError(
    "Disconnect the current WhatsApp device before starting a new pairing.",
    "pairing_disconnect_required",
  );
}

export async function loadUazapiSetupTarget(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  return loadWhatsappSetupTarget(
    {
      actorErrorMessage: "Uazapi pairing requires an authenticated store user.",
      provider: "uazapi",
    },
    context,
    connectionId,
    ports,
    openUazapiSetupCredentials,
  );
}

export async function openUazapiSetupCredentials(
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<UazapiSetupCredentials> {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedBaseUrl = readString(stored.baseUrl);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  if (!sealedBaseUrl || !sealedInstanceId || !sealedInstanceToken) {
    throw new CrmConnectionSetupProviderError(
      "Uazapi credentials are incomplete. Provision the instance again before provider operations.",
      "configuration_error",
    );
  }
  const vault = getCrmConnectionCredentialVault(ports);
  const scope = {
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  };
  const [apiBaseUrl, instanceId, instanceToken] = await Promise.all([
    vault.open({
      ...scope,
      purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
      sealed: sealedBaseUrl,
    }),
    vault.open({
      ...scope,
      purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
      sealed: sealedInstanceId,
    }),
    vault.open({
      ...scope,
      purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
      sealed: sealedInstanceToken,
    }),
  ]);
  return { apiBaseUrl, instanceId, instanceToken };
}

export function setupUazapiPairingAudit(action: string, connectionId: string) {
  return {
    action,
    category: "data_change" as const,
    entityId: connectionId,
    entityType: "crm_whatsapp_connection",
    metadata: { connectionId },
    permission: connectionPermission,
    summary: "Requested uazapi WhatsApp pairing",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function runUazapiProviderOperation<T>(
  context: ServiceContext,
  connectionId: string,
  operation: string,
  action: () => Promise<T>,
) {
  return runWhatsappProviderOperation(
    "uazapi",
    context,
    connectionId,
    operation,
    action,
  );
}
