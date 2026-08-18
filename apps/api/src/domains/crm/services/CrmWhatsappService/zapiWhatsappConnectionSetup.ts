import {
  assertPermission,
  assertEntitlement,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmConnectionSetupProviderError,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  type ZapiSetupCredentials,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  getCrmConnectionCredentialVault,
  getZapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";

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
      const result = await runProviderOperation(
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
      const result = await runProviderOperation(
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
  assertPermission(context, connectionPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Z-API pairing requires an authenticated store user.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm_zapi");
  logCrmServiceEvent(context, "crm.provider.zapi.connection.setup.started", {
    connectionId,
  });
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(connectionId);
  }
  return {
    connection,
    credentials: await openZapiSetupCredentials(connection, ports),
  };
}

export async function openZapiSetupCredentials(
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<ZapiSetupCredentials> {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  if (!sealedInstanceId || !sealedInstanceToken) {
    throw new CrmConnectionNotFoundError(connection.id);
  }
  const vault = getCrmConnectionCredentialVault(ports);
  const scope = {
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  };
  const [instanceId, instanceToken] = await Promise.all([
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
  return { instanceId, instanceToken };
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

async function runProviderOperation<T>(
  context: ServiceContext,
  connectionId: string,
  operation: string,
  action: () => Promise<T>,
) {
  const startedAt = Date.now();
  try {
    const result = await action();
    logCrmServiceEvent(context, "crm.provider.zapi.operation.completed", {
      connectionId,
      durationMs: Date.now() - startedAt,
      operation,
      provider: "zapi",
    });
    return result;
  } catch (error) {
    logCrmServiceEvent(context, "crm.provider.zapi.operation.failed", {
      connectionId,
      durationMs: Date.now() - startedAt,
      errorCode:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "request_failed",
      operation,
      provider: "zapi",
    });
    throw error;
  }
}
