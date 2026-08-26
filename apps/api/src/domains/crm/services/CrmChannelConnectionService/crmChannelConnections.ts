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
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  toCrmChannelConnection,
  type CrmChannelConnection,
} from "../../channelConnections/channelConnectionModels.js";
import type { CrmChannelConnectionOverview } from "../../channelConnections/connectionCreation.js";
import {
  assertCredentialUpdateMatchesProvider,
  buildUpdatedConnectionCredentialsRef,
  buildUpdatedConnectionMetadata,
  type UpdateCrmChannelConnectionInput,
} from "../../channelConnections/channelConnectionUpdates.js";
import {
  readConnectionLiveStatus,
  sealUpdatedZapiCredentials,
} from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { persistReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";
import { buildCrmChannelConnectionOverview } from "./buildCrmChannelConnectionOverview.js";
import { prepareZapiCredentialRotation } from "./prepareZapiCredentialRotation.js";

export type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
export type { UpdateCrmChannelConnectionInput } from "../../channelConnections/channelConnectionUpdates.js";
const readPermission = "crm.conversations.read";
const updatePermission = "crm.messaging.connection.setup";
const credentialUpdatePermission = "crm.messaging.credentials.rotate";
export async function getCrmChannelConnectionOverview(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmChannelConnectionOverview> {
  const connections = await listCrmChannelConnections(context, ports);
  return buildCrmChannelConnectionOverview(context, ports, connections);
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
      assertEntitlement(context as never, "crm");
      if (input.instanceCredentials) {
        assertEntitlement(context as never, "crm");
      }
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
      const credentialsRef = buildUpdatedConnectionCredentialsRef(
        safeInput,
        current,
      );
      let metadata = buildUpdatedConnectionMetadata(
        current.metadata,
        safeInput,
      );
      let verifiedCredentialState: Awaited<
        ReturnType<typeof prepareZapiCredentialRotation>
      > | null = null;
      if (input.instanceCredentials && credentialsRef) {
        verifiedCredentialState = await prepareZapiCredentialRotation(
          current,
          input,
          credentialsRef,
          ports,
        );
        metadata = verifiedCredentialState.metadata;
      }
      const updated = await repository.updateConnection({
        ...(credentialsRef ? { credentialsRef } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalInstanceId
          ? { externalInstanceId: input.externalInstanceId }
          : {}),
        ...(metadata ? { metadata } : {}),
        ...(verifiedCredentialState
          ? {
              ...(verifiedCredentialState.phone
                ? { phone: verifiedCredentialState.phone }
                : {}),
              status: verifiedCredentialState.status,
            }
          : input.status
            ? { status: input.status }
            : {}),
        connectionId: current.id,
        ...(input.expectedRevision !== undefined
          ? { expectedRevision: input.expectedRevision }
          : {}),
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!updated) throw new CrmConnectionNotFoundError(input.connectionId);
      const finalConnection =
        (await repository.findConnectionById(updated.id)) ?? updated;
      const result = toCrmChannelConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
      if (input.instanceCredentials) {
        await persistReadyChannelDefault(context, result, ports);
      }
      return result;
    },
  );
}
