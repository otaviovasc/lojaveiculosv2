import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmConnectionSetupProviderError,
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  type ZapiSetupCredentials,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  getCrmConnectionCredentialVault,
  getZapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import { recordCrmServiceMutation } from "../CrmMessagingService/serviceSupport.js";
import {
  loadWhatsappSetupTarget,
  runWhatsappProviderOperation,
} from "./whatsappConnectionSetupShared.js";

const connectionPermission = "crm.messaging.connection.pair" as const;

export type RequestZapiPairingQrInput = { connectionId: string };
export type RequestZapiPairingCodeInput = RequestZapiPairingQrInput & {
  phone: string;
};

export async function requestZapiPairingQr(
  context: ServiceContext,
  input: RequestZapiPairingQrInput,
  ports: CrmServicePorts,
) {
  const { connection, credentials } = await loadZapiSetupTarget(
    context,
    input.connectionId,
    ports,
  );
  return recordCrmServiceMutation(
    context,
    setupAudit("crm.provider.zapi.connection.pairing_qr", connection.id),
    async () => {
      const result = await runWhatsappProviderOperation(
        "zapi",
        context,
        connection.id,
        "pairing_qr",
        () => requestQrForDisconnectedInstance(credentials, ports),
      );
      return {
        expiresAt: new Date(
          Date.now() + result.expiresInSeconds * 1_000,
        ).toISOString(),
        qrCode: result.dataUri,
      };
    },
  );
}

export async function requestZapiPairingCode(
  context: ServiceContext,
  input: RequestZapiPairingCodeInput,
  ports: CrmServicePorts,
) {
  const { connection, credentials } = await loadZapiSetupTarget(
    context,
    input.connectionId,
    ports,
  );
  return recordCrmServiceMutation(
    context,
    setupAudit("crm.provider.zapi.connection.pairing_code", connection.id),
    async () => {
      const result = await runWhatsappProviderOperation(
        "zapi",
        context,
        connection.id,
        "pairing_code",
        () =>
          requestCodeForDisconnectedInstance(credentials, input.phone, ports),
      );
      return result.kind === "code"
        ? { code: result.code, requested: true }
        : { requested: true };
    },
  );
}

async function requestQrForDisconnectedInstance(
  credentials: ZapiSetupCredentials,
  ports: CrmServicePorts,
) {
  const provider = getZapiConnectionSetupProvider(ports);
  await assertInstanceDisconnected(await provider.validateStatus(credentials));
  return provider.getQrCode(credentials);
}

async function requestCodeForDisconnectedInstance(
  credentials: ZapiSetupCredentials,
  phone: string,
  ports: CrmServicePorts,
) {
  const provider = getZapiConnectionSetupProvider(ports);
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

async function loadZapiSetupTarget(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  return loadWhatsappSetupTarget(
    {
      actorErrorMessage: "Z-API pairing requires an authenticated store user.",
      provider: "zapi",
    },
    context,
    connectionId,
    ports,
    openZapiSetupCredentials,
  );
}

export async function openZapiSetupCredentials(
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<ZapiSetupCredentials> {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedClientToken = readString(stored.clientToken);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  if (!sealedClientToken || !sealedInstanceId || !sealedInstanceToken) {
    throw new CrmConnectionSetupProviderError(
      "Z-API credentials are incomplete. Re-enter all three credentials before provider operations.",
      "configuration_error",
    );
  }
  const vault = getCrmConnectionCredentialVault(ports);
  const scope = {
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  };
  const [clientToken, instanceId, instanceToken] = await Promise.all([
    vault.open({
      ...scope,
      purpose: ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
      sealed: sealedClientToken,
    }),
    vault.open({
      ...scope,
      purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
      sealed: sealedInstanceId,
    }),
    vault.open({
      ...scope,
      purpose: ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
      sealed: sealedInstanceToken,
    }),
  ]);
  return { clientToken, instanceId, instanceToken };
}

function setupAudit(action: string, connectionId: string) {
  return {
    action,
    category: "data_change" as const,
    entityId: connectionId,
    entityType: "crm_whatsapp_connection",
    metadata: { connectionId },
    permission: connectionPermission,
    summary: "Requested Z-API WhatsApp pairing",
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
