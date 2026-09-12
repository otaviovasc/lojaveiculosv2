import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  InternalHealthSnapshot,
  InternalMonitoringQuery,
} from "../../ports/internalMonitoringRepository.js";
import {
  normalizeInternalHealthLimit,
  requireInternalMonitoringScope,
  type InternalMonitoringServicePorts,
} from "./serviceSupport.js";

export async function getInternalHealthSnapshot(
  context: ServiceContext,
  input: InternalMonitoringQuery,
  ports: InternalMonitoringServicePorts,
): Promise<InternalHealthSnapshot> {
  assertPermission(context, "audit.read");
  const scope = requireInternalMonitoringScope(context);
  const query = {
    ...input,
    limit: normalizeInternalHealthLimit(input.limit),
  } satisfies InternalMonitoringQuery;
  context.logger.info(
    "internal.health.read",
    createServiceLogMetadata(context, {
      filters: {
        action: query.action ?? null,
        actorId: query.actorId ?? null,
        category: query.category ?? null,
        correlationId: query.correlationId ?? null,
        criticality: query.criticality ?? null,
        entityId: query.entityId ?? null,
        entityType: query.entityType ?? null,
        from: query.from?.toISOString() ?? null,
        outcome: query.outcome ?? null,
        providerName: query.providerName ?? null,
        requestId: query.requestId ?? null,
        severity: query.severity ?? null,
        to: query.to?.toISOString() ?? null,
      },
      limit: query.limit,
      requestedLimit: input.limit,
    }),
  );
  const snapshot = await ports.internalMonitoringRepository.getHealthSnapshot({
    query,
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
      limit: query.limit,
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
