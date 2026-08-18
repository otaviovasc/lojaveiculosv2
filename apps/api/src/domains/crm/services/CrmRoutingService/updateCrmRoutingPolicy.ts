import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  CrmBotRoutingMode,
  CrmRoutingChannel,
} from "../../ports/crmRoutingPolicyRepository.js";
import {
  getCrmRoutingConnectionRepository,
  getCrmRoutingPolicyRepository,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { CrmRoutingPolicyValidationError } from "./routingErrors.js";
import type {
  CrmRoutingCapability,
  CrmRoutingPolicyReadModel,
} from "./routingReadModels.js";
import { resolveCrmConnectionRoute } from "./routingResolution.js";
import { resolveCrmRoutingPolicy } from "./resolveCrmRoutingPolicy.js";

const routingPermission = "crm.routing.default.manage";
const requiredCapabilities = ["outbound"] as const;

export type UpdateCrmRoutingPolicyInput = {
  bot: { connectionId?: string | null; mode: CrmBotRoutingMode };
  channel: CrmRoutingChannel;
  defaultConnectionId: string | null;
};

export async function updateCrmRoutingPolicy(
  context: ServiceContext,
  input: UpdateCrmRoutingPolicyInput,
  ports: CrmServicePorts,
): Promise<CrmRoutingPolicyReadModel> {
  assertPermission(context, routingPermission);
  const permission = routingPermission;
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const scope = requireCrmWhatsappScope(context);
  context.logger.info("crm.routing.policy.update.started", {
    botMode: input.bot.mode,
    channel: input.channel,
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await context.audit.record({
    action: "crm.routing.policy.update",
    actor: context.actor,
    category: "data_change",
    entityId: scope.storeId,
    entityType: "store",
    metadata: {
      botConnectionId: input.bot.connectionId ?? null,
      botMode: input.bot.mode,
      channel: input.channel,
      defaultConnectionId: input.defaultConnectionId,
      permission,
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Update CRM channel routing policy",
    tenantId: scope.tenantId,
  });
  try {
    const botConnectionId = normalizeBotConnection(input);
    await runCrmTransaction(ports, async (transactionPorts) => {
      const connectionRepository =
        getCrmRoutingConnectionRepository(transactionPorts);
      const connections = await connectionRepository.listConnections(
        scope as never,
      );
      const byId = new Map(
        connections.map((connection) => [connection.id, connection]),
      );
      assertConnectionReady(
        input.channel,
        input.defaultConnectionId,
        byId,
        scope,
        requiredCapabilities,
      );
      if (input.bot.mode === "explicit_connection") {
        assertConnectionReady(
          input.channel,
          botConnectionId,
          byId,
          scope,
          requiredCapabilities,
        );
      }
      await getCrmRoutingPolicyRepository(transactionPorts).upsertPolicy({
        botConnectionId,
        botMode: input.bot.mode,
        channel: input.channel,
        defaultConnectionId: input.defaultConnectionId,
        ...scope,
      } as never);
    });
    const result = await resolveCrmRoutingPolicy(
      scope,
      ports,
      requiredCapabilities,
    );
    await recordOutcome(
      context,
      input,
      scope,
      "succeeded",
      undefined,
      result,
      permission,
    );
    return result;
  } catch (error) {
    await recordOutcome(
      context,
      input,
      scope,
      "failed",
      error,
      undefined,
      permission,
    );
    throw error;
  }
}

function assertConnectionReady(
  channel: CrmRoutingChannel,
  connectionId: string | null,
  byId: ReadonlyMap<
    string,
    Parameters<typeof resolveCrmConnectionRoute>[0]["connection"]
  >,
  scope: { storeId: string; tenantId: string },
  capabilities: readonly CrmRoutingCapability[],
) {
  if (!connectionId) return;
  const resolved = resolveCrmConnectionRoute({
    channel,
    connection: byId.get(connectionId) ?? null,
    connectionId,
    requiredCapabilities: capabilities,
    scope,
  });
  if (resolved.blocked) {
    throw new CrmRoutingPolicyValidationError(
      resolved.blocked.message,
      resolved.blocked.code,
    );
  }
}

function normalizeBotConnection(input: UpdateCrmRoutingPolicyInput) {
  if (input.bot.mode !== "explicit_connection") return null;
  if (!input.bot.connectionId) {
    throw new CrmRoutingPolicyValidationError(
      "Explicit bot routing requires a connection.",
      "policy_not_configured",
    );
  }
  return input.bot.connectionId;
}

async function recordOutcome(
  context: ServiceContext,
  input: UpdateCrmRoutingPolicyInput,
  scope: { storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  error?: unknown,
  result?: CrmRoutingPolicyReadModel,
  permission?: PermissionKey,
) {
  const channelReadiness = result?.channels.find(
    (channel) => channel.channel === input.channel,
  );
  await context.audit.record({
    action: "crm.routing.policy.update",
    actor: context.actor,
    category: "data_change",
    entityId: scope.storeId,
    entityType: "store",
    metadata: {
      botConnectionId: input.bot.connectionId ?? null,
      botMode: input.bot.mode,
      botReady: channelReadiness?.bot.ready ?? false,
      channel: input.channel,
      defaultConnectionId: input.defaultConnectionId,
      ...(error
        ? { errorName: error instanceof Error ? error.name : "UnknownError" }
        : {}),
      permission: permission ?? routingPermission,
      storeDefaultReady: channelReadiness?.storeDefault.ready ?? false,
    },
    outcome,
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Updated CRM channel routing policy",
    tenantId: scope.tenantId,
  });
}
