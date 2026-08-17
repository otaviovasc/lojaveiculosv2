import {
  assertAnyPermission,
  assertEntitlement,
} from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  CrmRoutingCapability,
  CrmRoutingPolicyReadModel,
} from "./routingReadModels.js";
import { resolveCrmRoutingPolicy } from "./resolveCrmRoutingPolicy.js";

const permissions = [
  "crm.bot.read",
  "crm.bot.manage",
  "crm.whatsapp.list",
] as const satisfies readonly PermissionKey[];
const defaultCapabilities = ["outbound"] as const;

export async function getCrmRoutingPolicy(
  context: ServiceContext,
  ports: CrmServicePorts,
  requiredCapabilities: readonly CrmRoutingCapability[] = defaultCapabilities,
): Promise<CrmRoutingPolicyReadModel> {
  const permission = assertAnyPermission(context, permissions);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const scope = requireCrmWhatsappScope(context);
  context.logger.info("crm.routing.policy.read.started", {
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  const result = await resolveCrmRoutingPolicy(
    scope,
    ports,
    requiredCapabilities,
  );
  const readiness = summarizeReadiness(result);
  await context.audit.record({
    action: "crm.routing.policy.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { permission, ...readiness },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Read CRM channel routing policy",
    tenantId: scope.tenantId,
  });
  return result;
}

function summarizeReadiness(result: CrmRoutingPolicyReadModel) {
  return {
    botReadyCount: result.channels.filter((channel) => channel.bot.ready)
      .length,
    channelCount: result.channels.length,
    storeDefaultReadyCount: result.channels.filter(
      (channel) => channel.storeDefault.ready,
    ).length,
  };
}
