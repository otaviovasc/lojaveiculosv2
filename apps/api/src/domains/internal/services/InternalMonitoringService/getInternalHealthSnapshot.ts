import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { InternalHealthSnapshot } from "../../ports/internalMonitoringRepository.js";
import {
  normalizeInternalHealthLimit,
  requireInternalMonitoringScope,
  type InternalMonitoringServicePorts,
} from "./serviceSupport.js";

export async function getInternalHealthSnapshot(
  context: ServiceContext,
  input: { limit: number },
  ports: InternalMonitoringServicePorts,
): Promise<InternalHealthSnapshot> {
  assertPermission(context, "audit.read");
  const scope = requireInternalMonitoringScope(context);
  const limit = normalizeInternalHealthLimit(input.limit);
  context.logger.info(
    "internal.health.read",
    createServiceLogMetadata(context, {
      limit,
      requestedLimit: input.limit,
    }),
  );
  const snapshot = await ports.internalMonitoringRepository.getHealthSnapshot({
    limit,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "internal.health.read",
    actor: context.actor,
    category: "data_access",
    dataClassification: "internal",
    entityId: scope.storeId,
    entityType: "internal_health",
    metadata: {
      criticalEvents: snapshot.summary.criticalEvents,
      limit,
      openSinkFailures: snapshot.summary.openSinkFailures,
      recentEvents: snapshot.summary.recentEvents,
      requestedLimit: input.limit,
      status: snapshot.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read internal health snapshot",
  });

  return snapshot;
}
