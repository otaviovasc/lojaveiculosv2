import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmMessagingChannel } from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import {
  getCrmRoutingConnectionRepository,
  getCrmRoutingPolicyRepository,
  requireCrmMessagingScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { resolveCrmConnectionRoute } from "./routingResolution.js";

const requiredCapabilities = ["outbound"] as const;
const automaticSetupPermission = "crm.messaging.connection.setup";
type AutomaticDefaultResult = "already_present" | "created" | "superseded";
type AutomaticDefaultPermission =
  "crm.messages.ingest" | "crm.messaging.connection.setup";

/** Persist the connection that first becomes ready; this is not a runtime fallback. */
export async function persistInitialReadyChannelDefault(
  context: ServiceContext,
  input: { channel: CrmMessagingChannel; connectionId: string },
  ports: CrmServicePorts,
) {
  const authorizationPermission = readAuthorizationPermission(context);
  assertPermission(context, authorizationPermission);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const scope = requireCrmMessagingScope(context);
  await context.audit.record({
    action: "crm.routing.policy.default.create",
    actor: context.actor,
    category: "data_change",
    entityId: input.connectionId,
    entityType: "crm_channel_routing_policy",
    metadata: {
      channel: input.channel,
      connectionId: input.connectionId,
      permission: authorizationPermission,
      trigger: "connection_setup",
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Create the initial ready CRM channel default",
    tenantId: scope.tenantId,
  });
  try {
    const result = await runCrmTransaction(
      ports,
      async (transactionPorts): Promise<AutomaticDefaultResult> => {
        const connections = getCrmRoutingConnectionRepository(transactionPorts);
        const policies = getCrmRoutingPolicyRepository(transactionPorts);
        const current = (await policies.listPolicies(scope as never)).find(
          (policy) => policy.channel === input.channel,
        );
        if (current?.defaultConnectionId) return "already_present";

        const candidate = (
          await connections.listConnections(scope as never)
        ).find((connection) => connection.id === input.connectionId);
        if (
          !resolveCrmConnectionRoute({
            channel: input.channel,
            connection: candidate ?? null,
            connectionId: input.connectionId,
            requiredCapabilities,
            scope,
          }).ready
        ) {
          return "superseded";
        }

        const created = await policies.createDefaultIfMissing({
          externalBotConnectionId: current?.externalBotConnectionId ?? null,
          externalBotMode: current?.externalBotMode ?? "disabled",
          channel: input.channel,
          defaultConnectionId: input.connectionId,
          ...scope,
        } as never);
        return created ? "created" : "superseded";
      },
    );
    if (result === "created") {
      context.logger.info("crm.routing.policy.default.created", {
        channel: input.channel,
        connectionId: input.connectionId,
        requestId: context.requestId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
    }
    await recordTerminal(
      context,
      input,
      scope,
      "succeeded",
      result,
      authorizationPermission,
    );
    return result === "created";
  } catch (error) {
    await recordTerminal(
      context,
      input,
      scope,
      "failed",
      "failed",
      authorizationPermission,
      error,
    );
    throw error;
  }
}

export async function persistReadyChannelDefault(
  context: ServiceContext,
  connection: CrmChannelConnection,
  ports: CrmServicePorts,
) {
  if (
    !connection.ready ||
    !ports.crmRoutingConnectionRepository ||
    !ports.crmRoutingPolicyRepository
  ) {
    return false;
  }
  try {
    return await persistInitialReadyChannelDefault(
      context,
      { channel: connection.channel, connectionId: connection.id },
      ports,
    );
  } catch (error) {
    const scope = requireCrmMessagingScope(context);
    context.logger.warn("crm.routing.policy.default.deferred", {
      channel: connection.channel,
      connectionId: connection.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId: context.requestId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    return false;
  }
}

async function recordTerminal(
  context: ServiceContext,
  input: { channel: CrmMessagingChannel; connectionId: string },
  scope: { storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  result: AutomaticDefaultResult | "failed",
  authorizationPermission: AutomaticDefaultPermission,
  error?: unknown,
) {
  await context.audit.record({
    action: "crm.routing.policy.default.create",
    actor: context.actor,
    category: "data_change",
    entityId: input.connectionId,
    entityType: "crm_channel_routing_policy",
    metadata: {
      channel: input.channel,
      connectionId: input.connectionId,
      ...(error
        ? { errorName: error instanceof Error ? error.name : "UnknownError" }
        : {}),
      permission: authorizationPermission,
      result,
      trigger: "connection_setup",
    },
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    summary:
      outcome === "failed"
        ? "Failed to create the initial ready CRM channel default"
        : "Evaluated the initial ready CRM channel default",
    tenantId: scope.tenantId,
  });
}

function readAuthorizationPermission(
  context: ServiceContext,
): AutomaticDefaultPermission {
  return context.actor.kind === "integration"
    ? "crm.messages.ingest"
    : automaticSetupPermission;
}
