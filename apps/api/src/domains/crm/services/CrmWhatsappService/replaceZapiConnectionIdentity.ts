import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { CrmZapiConnectionConflictError } from "../../channelConnections/connectionCreation.js";
import { startZapiConnectionReplacement } from "./replaceZapiConnection.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { updateCrmChannelConnection } from "../CrmChannelConnectionService/crmChannelConnections.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import type {
  ZapiSupportScope,
  ZapiSupportWebhookTarget,
} from "./manageZapiConnectionAsSupport.js";

type CredentialRotationInput = ZapiSupportScope &
  ZapiSupportWebhookTarget & {
    allowIdentityReplacement?: boolean;
    clientToken: string;
    connectionId: string;
    expectedRevision?: number;
    idempotencyKey?: string;
    instanceId: string;
    instanceToken: string;
  };

export class ZapiIdentityReplacementRequiresSupportError extends Error {
  constructor() {
    super("Replacing the Z-API instance identity requires support recovery.");
    this.name = "ZapiIdentityReplacementRequiresSupportError";
  }
}

export async function updateVerifiedZapiConnectionIdentity(
  context: StoreScopedServiceContext,
  input: CredentialRotationInput,
  ports: CrmServicePorts,
) {
  assertPermission(context, credentialRotationPermission);
  logCrmServiceEvent(
    context,
    "crm.provider.zapi.connection.identity_update.started",
    {
      connectionId: input.connectionId,
      provider: "zapi",
    },
  );
  const current = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !current ||
    current.provider !== "zapi" ||
    current.status === "archived" ||
    current.storeId !== input.storeId ||
    current.tenantId !== input.tenantId
  ) {
    throw new CrmConnectionNotFoundError(input.connectionId);
  }
  if (
    input.expectedRevision !== undefined &&
    current.revision !== input.expectedRevision
  ) {
    throw new CrmZapiConnectionConflictError({
      connectionId: current.id,
      expectedRevision: input.expectedRevision,
      identityRelation: "same_instance",
      nextAction: "repair_credentials",
    });
  }
  const currentInstanceId = await readCurrentZapiInstanceId(
    current,
    input,
    ports,
  );
  if (currentInstanceId !== input.instanceId.trim()) {
    if (input.allowIdentityReplacement === false) {
      throw new ZapiIdentityReplacementRequiresSupportError();
    }
    const replacement = await startZapiConnectionReplacement(
      context,
      {
        connectionId: current.id,
        expectedRevision: current.revision ?? 0,
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
        clientToken: input.clientToken,
        instanceId: input.instanceId,
        instanceToken: input.instanceToken,
        basePath: input.basePath,
        canonicalApiOrigin: input.canonicalApiOrigin,
      },
      ports,
    );
    return replacement.connection;
  }
  const updated = await updateCrmChannelConnection(
    context,
    {
      connectionId: input.connectionId,
      ...(input.expectedRevision !== undefined
        ? { expectedRevision: input.expectedRevision }
        : {}),
      instanceCredentials: {
        clientToken: input.clientToken,
        instanceId: input.instanceId,
        instanceToken: input.instanceToken,
      },
      webhookSetupTarget: input,
    },
    ports,
  );
  await auditCrmServiceEvent(context, {
    action: "crm.provider.zapi.connection.credentials_rotated",
    category: "data_change",
    entityId: updated.id,
    entityType: "crm_whatsapp_connection",
    metadata: { identityOutcome: "same_instance", provider: "zapi" },
    permission: credentialRotationPermission,
    summary: "Rotated credentials for the verified Z-API instance",
  });
  return updated;
}

const credentialRotationPermission = "crm.messaging.credentials.rotate";

async function readCurrentZapiInstanceId(
  connection: CrmConnection,
  scope: ZapiSupportScope,
  ports: CrmServicePorts,
) {
  if (connection.externalInstanceId?.trim()) {
    return connection.externalInstanceId.trim();
  }
  const stored = readRecord(connection.credentialsRef.stored);
  const sealedInstanceId = readString(stored.instanceId);
  if (!sealedInstanceId) return null;
  return getCrmConnectionCredentialVault(ports).open({
    purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    sealed: sealedInstanceId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
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
