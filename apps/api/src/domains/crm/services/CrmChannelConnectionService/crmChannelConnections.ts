import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  isCrmOlxChatEnabled,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmBillingQuotaGuard } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  connectionIdentityKey,
  setupProviderForConnection,
  toCrmChannelConnection,
  type CrmChannelConnection,
} from "../../channelConnections/channelConnectionModels.js";
import type {
  CrmChannelConnectionOverview,
  CrmChannelConnectionSetupIdentity,
} from "../../channelConnections/connectionCreation.js";
import {
  assertCredentialUpdateMatchesProvider,
  buildUpdatedConnectionCredentialsRef,
  buildUpdatedConnectionMetadata,
  type UpdateCrmChannelConnectionInput,
} from "../../channelConnections/channelConnectionUpdates.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import { runZapiWebhookSetupAttempt } from "../CrmWhatsappService/runZapiWebhookSetupAttempt.js";
import {
  readConnectionLiveStatus,
  sealUpdatedZapiCredentials,
} from "../../whatsapp/zapiConnectionCredentialUpdate.js";

export type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
export type { UpdateCrmChannelConnectionInput } from "../../channelConnections/channelConnectionUpdates.js";
const readPermission = "crm.conversations.read";
const updatePermission = "crm.messaging.connection.setup";
const credentialUpdatePermission = "tenant.manage";
const availableSetups = [
  { broker: "direct", channel: "whatsapp", provider: "zapi" },
  { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
  { broker: "composio", channel: "instagram", provider: "meta_cloud" },
] as const satisfies readonly CrmChannelConnectionSetupIdentity[];

export async function getCrmChannelConnectionOverview(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmChannelConnectionOverview> {
  const connections = await listCrmChannelConnections(context, ports);
  const scope = requireCrmMessagingScope(context);
  const getAllowance = getCrmBillingQuotaGuard(ports).getAllowance;
  if (!getAllowance) {
    throw new Error("Billing quota allowance resolver is unavailable.");
  }
  const allowance = await getAllowance({
    quotaKey: "crm_zapi",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const configured = new Set(
    connections
      .filter((connection) => connection.status !== "archived")
      .map(setupProviderForConnection)
      .filter((key): key is string => key !== null),
  );
  const entitlements =
    "entitlements" in context && Array.isArray(context.entitlements)
      ? context.entitlements
      : [];
  return {
    allowance,
    availableSetups: availableSetups.filter((identity) => {
      if (configured.has(connectionIdentityKey(identity))) return false;
      if (identity.provider === "zapi") return true;
      return entitlements.includes("crm");
    }),
    connections,
  };
}

export async function listCrmChannelConnections(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly CrmChannelConnection[]> {
  assertPermission(context, readPermission);
  assertEntitlement(context as never, "crm");
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConnectionRepository(ports);
  logCrmServiceEvent(context, "crm.channel_connections.list.started");
  const providers = [
    "zapi",
    "meta_cloud",
    ...(isCrmOlxChatEnabled(ports) ? (["olx"] as const) : []),
  ] as const;
  const connections = await repository.listConnections({
    channels: [
      "whatsapp",
      "instagram",
      ...(isCrmOlxChatEnabled(ports) ? (["olx_chat"] as const) : []),
    ],
    providers,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  const result = await Promise.all(
    connections.map(async (connection) =>
      toCrmChannelConnection(
        connection,
        await readConnectionLiveStatus(context, connection, ports),
      ),
    ),
  );
  const defaultConnectionIds = new Set(
    ports.crmRoutingPolicyRepository
      ? (
          await ports.crmRoutingPolicyRepository.listPolicies({
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          })
        )
          .map((policy) => policy.defaultConnectionId)
          .filter((id): id is string => Boolean(id))
      : [],
  );
  const canonicalResult = result.map((connection) => ({
    ...connection,
    isDefault: defaultConnectionIds.has(connection.id),
  }));
  await auditCrmServiceEvent(context, {
    action: "crm.channel_connections.list",
    category: "data_access",
    metadata: { connectionCount: canonicalResult.length },
    permission: readPermission,
    summary: "Listed CRM channel connections",
  });
  return canonicalResult;
}

export async function updateCrmChannelConnection(
  context: ServiceContext,
  input: UpdateCrmChannelConnectionInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  assertPermission(context, updatePermission);
  if (input.instanceCredentials) {
    assertPermission(context, credentialUpdatePermission);
  }
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.channel_connection.update.started", {
    connectionId: input.connectionId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.channel_connection.update",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_channel_connection",
      metadata: {
        connectionId: input.connectionId,
        updates: Object.keys(input)
          .filter((key) => key !== "connectionId")
          .join(","),
      },
      permission: updatePermission,
      summary: "Updated CRM messaging connection",
    },
    async () => {
      const repository = getCrmConnectionRepository(ports);
      const current = await repository.findConnectionById(input.connectionId);
      if (
        !current ||
        current.status === "archived" ||
        current.storeId !== scope.storeId ||
        current.tenantId !== scope.tenantId
      ) {
        throw new CrmConnectionNotFoundError(input.connectionId);
      }
      assertEntitlement(
        context as never,
        current.provider === "zapi" ? "crm_zapi" : "crm",
      );
      assertCredentialUpdateMatchesProvider(current, input);
      const safeInput = input.instanceCredentials
        ? {
            ...input,
            instanceCredentials: await sealUpdatedZapiCredentials(
              input.instanceCredentials,
              current,
              scope,
              ports,
            ),
          }
        : input;
      let metadata = buildUpdatedConnectionMetadata(
        current.metadata,
        safeInput,
      );
      if (input.instanceCredentials) {
        metadata = withZapiWebhookSetupState(
          metadata ?? current.metadata,
          createZapiWebhookSetupIntent(current.id),
        );
      }
      const credentialsRef = buildUpdatedConnectionCredentialsRef(
        safeInput,
        current,
      );
      const updated = await repository.updateConnection({
        ...(credentialsRef ? { credentialsRef } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalInstanceId
          ? { externalInstanceId: input.externalInstanceId }
          : {}),
        ...(metadata ? { metadata } : {}),
        ...(input.status ? { status: input.status } : {}),
        connectionId: current.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!updated) throw new CrmConnectionNotFoundError(input.connectionId);
      if (input.instanceCredentials && input.webhookSetupTarget) {
        await runZapiWebhookSetupAttempt(
          context,
          { connectionId: updated.id, ...input.webhookSetupTarget },
          ports,
        );
      }
      const finalConnection =
        (await repository.findConnectionById(updated.id)) ?? updated;
      return toCrmChannelConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
    },
  );
}
