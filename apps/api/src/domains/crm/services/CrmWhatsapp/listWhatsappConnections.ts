import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  isCrmOlxChatEnabled,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmBillingQuotaGuard } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
} from "../../whatsapp/whatsappConnectionModels.js";
import type {
  CreatableWhatsappConnectionProvider,
  WhatsappConnectionOverview,
} from "../../whatsapp/whatsappConnectionCreation.js";
import {
  assertCredentialUpdateMatchesProvider,
  buildUpdatedConnectionCredentialsRef,
  buildUpdatedConnectionMetadata,
  type UpdateWhatsappConnectionInput,
} from "../../whatsapp/whatsappConnectionUpdates.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import { runZapiWebhookSetupAttempt } from "./runZapiWebhookSetupAttempt.js";
import {
  readConnectionLiveStatus,
  sealUpdatedZapiCredentials,
} from "../../whatsapp/zapiConnectionCredentialUpdate.js";

export type { WhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";
export type { UpdateWhatsappConnectionInput } from "../../whatsapp/whatsappConnectionUpdates.js";

const readPermission = "crm.whatsapp.list";
const updatePermission = "crm.messaging.connection.setup";
const credentialUpdatePermission = "tenant.manage";
const creatableProviders = [
  "zapi",
  "composio_whatsapp",
] as const satisfies readonly CreatableWhatsappConnectionProvider[];

export async function getWhatsappConnectionOverview(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<WhatsappConnectionOverview> {
  const connections = await listWhatsappConnections(context, ports);
  const scope = requireCrmWhatsappScope(context);
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
      .map((connection) => connection.provider),
  );
  const entitlements =
    "entitlements" in context && Array.isArray(context.entitlements)
      ? context.entitlements
      : [];
  return {
    allowance,
    availableProviders: creatableProviders.filter((provider) => {
      if (configured.has(provider)) return false;
      if (provider === "zapi") return true;
      if (provider === "composio_whatsapp") {
        return entitlements.includes("crm");
      }
      return allowance.remaining > 0 && entitlements.includes("crm_zapi");
    }),
    connections,
  };
}

export async function listWhatsappConnections(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly WhatsappConnection[]> {
  assertPermission(context, readPermission);
  assertEntitlement(context as never, "crm");
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmConnectionRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.connections.list.started");
  const providers = [
    "zapi",
    "composio_whatsapp",
    "composio_instagram",
    ...(isCrmOlxChatEnabled(ports) ? (["olx_chat"] as const) : []),
  ] as const;
  const connections = await repository.listConnections({
    providers,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  const result = await Promise.all(
    connections.map(async (connection) =>
      toWhatsappConnection(
        connection,
        await readConnectionLiveStatus(context, connection, ports),
      ),
    ),
  );
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.connections.list",
    category: "data_access",
    metadata: { connectionCount: result.length },
    permission: readPermission,
    summary: "Listed CRM WhatsApp connections",
  });
  return result;
}

export async function updateWhatsappConnection(
  context: ServiceContext,
  input: UpdateWhatsappConnectionInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  assertPermission(context, updatePermission);
  if (input.instanceCredentials) {
    assertPermission(context, credentialUpdatePermission);
  }
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.connection.update.started", {
    connectionId: input.connectionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.connection.update",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
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
        throw new WhatsappConnectionNotFoundError(input.connectionId);
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
      if (!updated)
        throw new WhatsappConnectionNotFoundError(input.connectionId);
      if (input.instanceCredentials && input.webhookSetupTarget) {
        await runZapiWebhookSetupAttempt(
          context,
          { connectionId: updated.id, ...input.webhookSetupTarget },
          ports,
        );
      }
      const finalConnection =
        (await repository.findConnectionById(updated.id)) ?? updated;
      return toWhatsappConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
    },
  );
}
