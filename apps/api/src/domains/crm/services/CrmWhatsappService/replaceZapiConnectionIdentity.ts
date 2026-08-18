import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import { sealZapiCredentials } from "../../whatsapp/zapiInitialCredentials.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { toCrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { updateCrmChannelConnection } from "../CrmChannelConnectionService/crmChannelConnections.js";
import { runZapiWebhookSetupAttempt } from "./runZapiWebhookSetupAttempt.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import type {
  ZapiSupportScope,
  ZapiSupportWebhookTarget,
} from "./manageZapiConnectionAsSupport.js";

type CredentialRotationInput = ZapiSupportScope &
  ZapiSupportWebhookTarget & {
    connectionId: string;
    instanceId: string;
    instanceToken: string;
  };

export async function updateVerifiedZapiConnectionIdentity(
  context: StoreScopedServiceContext,
  input: CredentialRotationInput,
  ports: CrmServicePorts,
) {
  assertPermission(context, "tenant.manage");
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
  const currentInstanceId = await readCurrentZapiInstanceId(
    current,
    input,
    ports,
  );
  if (currentInstanceId !== input.instanceId.trim()) {
    return replaceZapiConnectionIdentity(context, input, current, ports);
  }
  const updated = await updateCrmChannelConnection(
    context,
    {
      connectionId: input.connectionId,
      externalInstanceId: input.instanceId.trim(),
      instanceCredentials: {
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
    permission: "tenant.manage",
    summary: "Rotated credentials for the verified Z-API instance",
  });
  return updated;
}

async function replaceZapiConnectionIdentity(
  context: StoreScopedServiceContext,
  input: CredentialRotationInput,
  current: CrmConnection,
  ports: CrmServicePorts,
) {
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.zapi.connection.identity_replace",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { identityOutcome: "new_instance", provider: "zapi" },
      permission: "tenant.manage",
      summary: "Archived the prior Z-API connection and created a new identity",
    },
    async () => {
      const credentialsRef = await sealZapiCredentials(
        {
          channel: "whatsapp",
          displayName: current.displayName,
          instanceId: input.instanceId,
          instanceToken: input.instanceToken,
          provider: "zapi",
        },
        input,
        ports,
        current.credentialsRef,
        { reuseWebhookSecret: false },
      );
      const created = await createReplacement(
        current,
        credentialsRef,
        input,
        ports,
      );
      await runZapiWebhookSetupAttempt(
        context,
        {
          basePath: input.basePath,
          canonicalApiOrigin: input.canonicalApiOrigin,
          connectionId: created.id,
        },
        ports,
      );
      const finalConnection =
        (await getCrmConnectionRepository(ports).findConnectionById(
          created.id,
        )) ?? created;
      return toCrmChannelConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
    },
  );
}

async function createReplacement(
  current: CrmConnection,
  credentialsRef: Record<string, unknown>,
  input: CredentialRotationInput,
  ports: CrmServicePorts,
) {
  return runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmConnectionRepository(transactionPorts);
    const archived = await repository.updateConnection({
      connectionId: current.id,
      status: "archived",
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    if (!archived) throw new CrmConnectionNotFoundError(current.id);
    let replacement = await repository.createConnection({
      broker: "direct",
      channel: "whatsapp",
      credentialsRef,
      displayName: current.displayName,
      externalInstanceId: input.instanceId.trim(),
      provider: "zapi",
      status: "sandbox",
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    replacement =
      (await repository.updateConnection({
        connectionId: replacement.id,
        metadata: withZapiWebhookSetupState(
          replacement.metadata,
          createZapiWebhookSetupIntent(replacement.id),
        ),
        storeId: input.storeId,
        tenantId: input.tenantId,
      })) ?? replacement;
    return replacement;
  });
}

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
