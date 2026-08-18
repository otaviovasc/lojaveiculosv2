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
const automaticSetupPermission = "crm.messaging.connection.setup";
type AutomaticDefaultResult = "already_present" | "created" | "superseded";

/** Persist the first unambiguous ready route; this is not a runtime fallback. */
export async function ensureFirstReadyChannelDefault(
  context: ServiceContext,
  input: { channel: CrmRoutingChannel; connectionId: string },
  ports: CrmServicePorts,
) {
  assertPermission(context, automaticSetupPermission);
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
      permission: automaticSetupPermission,
      trigger: "connection_setup",
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Create the first ready CRM channel default",
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

        const ready = (
          await connections.listConnections(scope as never)
        ).filter(
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
        if (ready.length !== 1 || ready[0]?.id !== input.connectionId) {
          return "superseded";
        }

        const created = await policies.createDefaultIfMissing({
          botConnectionId: current?.botConnectionId ?? null,
          botMode: current?.botMode ?? "disabled",
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
    await recordTerminal(context, input, scope, "succeeded", result);
    return result === "created";
  } catch (error) {
    await recordTerminal(context, input, scope, "failed", "failed", error);
    throw error;
  }
}

async function recordTerminal(
  context: ServiceContext,
  input: { channel: CrmRoutingChannel; connectionId: string },
  scope: { storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  result: AutomaticDefaultResult | "failed",
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
      permission: automaticSetupPermission,
      result,
      trigger: "connection_setup",
    },
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    summary:
      outcome === "failed"
        ? "Failed to create the first ready CRM channel default"
        : "Evaluated the first ready CRM channel default",
    tenantId: scope.tenantId,
  });
}
