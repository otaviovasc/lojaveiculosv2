import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmRoutingChannel } from "../../ports/crmRoutingPolicyRepository.js";
import {
  getCrmRoutingConnectionRepository,
  getCrmRoutingPolicyRepository,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { resolveCrmConnectionRoute } from "./routingResolution.js";

const requiredCapabilities = ["outbound"] as const;
const routingPermission = "crm.routing.default.manage";

/** Persist the first unambiguous ready route; this is not a runtime fallback. */
export async function ensureFirstReadyChannelDefault(
  context: ServiceContext,
  input: { channel: CrmRoutingChannel; connectionId: string },
  ports: CrmServicePorts,
) {
  assertPermission(context, routingPermission);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const scope = requireCrmWhatsappScope(context);
  await context.audit.record({
    action: "crm.routing.policy.default.create",
    actor: context.actor,
    category: "data_change",
    entityId: input.connectionId,
    entityType: "crm_channel_routing_policy",
    metadata: {
      channel: input.channel,
      connectionId: input.connectionId,
      permission: routingPermission,
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Create the first ready CRM channel default",
    tenantId: scope.tenantId,
  });
  const persisted = await runCrmTransaction(ports, async (transactionPorts) => {
    const connections = getCrmRoutingConnectionRepository(transactionPorts);
    const mapping = { connectionIds: [input.connectionId], ...scope } as never;
    await connections.synchronizeLegacyConnections(mapping);
    const verified = await connections.verifyLegacyMappings?.(mapping);
    if (!verified?.includes(input.connectionId)) return false;

    const policies = getCrmRoutingPolicyRepository(transactionPorts);
    const current = (await policies.listPolicies(scope as never)).find(
      (policy) => policy.channel === input.channel,
    );
    if (current?.defaultConnectionId) return false;

    const ready = (await connections.listConnections(scope as never)).filter(
      (connection) =>
        connection.channel === input.channel &&
        resolveCrmConnectionRoute({
          channel: input.channel,
          connection,
          connectionId: connection.id,
          requiredCapabilities,
          scope,
        }).ready,
    );
    if (ready.length !== 1 || ready[0]?.id !== input.connectionId) return false;

    return Boolean(
      await policies.createDefaultIfMissing({
        botConnectionId: current?.botConnectionId ?? null,
        botMode: current?.botMode ?? "disabled",
        channel: input.channel,
        defaultConnectionId: input.connectionId,
        ...scope,
      } as never),
    );
  });
  if (persisted) {
    context.logger.info("crm.routing.policy.default.created", {
      channel: input.channel,
      connectionId: input.connectionId,
      requestId: context.requestId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    await context.audit.record({
      action: "crm.routing.policy.default.create",
      actor: context.actor,
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_channel_routing_policy",
      metadata: {
        channel: input.channel,
        connectionId: input.connectionId,
        permission: routingPermission,
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: scope.storeId,
      summary: "Created the first ready CRM channel default",
      tenantId: scope.tenantId,
    });
  }
  return persisted;
}
