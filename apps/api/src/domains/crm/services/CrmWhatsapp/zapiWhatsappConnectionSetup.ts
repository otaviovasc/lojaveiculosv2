import {
  assertPermission,
  assertEntitlement,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  type ZapiSetupCredentials,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import { WhatsappMessageActionError } from "../../whatsapp/whatsappSendErrors.js";
import { readZapiWebhookSetupState } from "../../whatsapp/zapiWebhookSetupState.js";
import {
  getCrmConnectionRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  getCrmConnectionCredentialVault,
  getZapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const connectionPermission = "crm.whatsapp.connection.manage" as const;
const integrationPermission = "crm.whatsapp.integrations.manage";

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
  return recordWhatsappServiceMutation(
    context,
    setupAudit("crm.whatsapp.connection.zapi.pairing_qr", connection.id),
    async () => {
      const result = await runProviderOperation(
        context,
        connection.id,
        "pairing_qr",
        () => getZapiConnectionSetupProvider(ports).getQrCode(credentials),
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
  return recordWhatsappServiceMutation(
    context,
    setupAudit("crm.whatsapp.connection.zapi.pairing_code", connection.id),
    async () => {
      const result = await runProviderOperation(
        context,
        connection.id,
        "pairing_code",
        () =>
          getZapiConnectionSetupProvider(ports).getPairingCode(
            credentials,
            input.phone,
          ),
      );
      return result.kind === "code"
        ? { code: result.code, requested: true }
        : { requested: true };
    },
  );
}

async function loadZapiSetupTarget(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  assertPermission(context, connectionPermission);
  assertPermission(context, integrationPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Z-API pairing requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  assertEntitlement(context as never, "crm_zapi");
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.connection.zapi.setup.started",
    {
      connectionId,
    },
  );
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(connectionId);
  }
  const setup = readZapiWebhookSetupState(connection.metadata);
  if (setup?.status !== "configured") {
    throw new WhatsappMessageActionError(
      `Z-API setup is not ready. Support code: ${setup?.supportCode ?? "ZAPI-SETUP"}.`,
      409,
    );
  }
  return {
    connection,
    credentials: await openZapiCredentials(connection, ports),
  };
}

async function openZapiCredentials(
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<ZapiSetupCredentials> {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedInstanceId = readString(stored.instanceId);
  const sealedInstanceToken = readString(stored.instanceToken);
  if (!sealedInstanceId || !sealedInstanceToken) {
    throw new WhatsappConnectionNotFoundError(connection.id);
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
    logWhatsappServiceEvent(context, "crm.provider.zapi.operation.completed", {
      connectionId,
      durationMs: Date.now() - startedAt,
      operation,
      provider: "zapi",
    });
    return result;
  } catch (error) {
    logWhatsappServiceEvent(context, "crm.provider.zapi.operation.failed", {
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
