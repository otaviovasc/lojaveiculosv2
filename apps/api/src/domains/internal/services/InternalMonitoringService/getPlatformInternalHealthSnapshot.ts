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
  requirePlatformInternalMonitoringAccess,
  normalizeInternalHealthLimit,
  type InternalMonitoringServicePorts,
} from "./serviceSupport.js";

export async function getPlatformInternalHealthSnapshot(
  context: ServiceContext,
  input: InternalMonitoringQuery,
  ports: InternalMonitoringServicePorts,
): Promise<InternalHealthSnapshot> {
  assertPermission(context, "audit.read");
  requirePlatformInternalMonitoringAccess(context);
  const query = {
    ...input,
    limit: normalizeInternalHealthLimit(input.limit),
  } satisfies InternalMonitoringQuery;

  const snapshot =
    await ports.internalMonitoringRepository.getPlatformHealthSnapshot({
      query,
    });

  context.logger.info(
    "internal.platform_health.read",
    createServiceLogMetadata(context, {
      filters: {
        action: query.action ?? null,
        correlationId: query.correlationId ?? null,
        entityId: query.entityId ?? null,
        outcome: query.outcome ?? null,
        providerName: query.providerName ?? null,
        requestId: query.requestId ?? null,
        severity: query.severity ?? null,
      },
      limit: query.limit,
      status: snapshot.status,
    }),
  );

  await context.audit.record({
    action: "internal.platform_health.read",
    actor: context.actor,
    category: "data_access",
    dataClassification: "restricted",
    entityId: "platform",
    entityType: "internal_health",
    metadata: {
      criticalEvents: snapshot.summary.criticalEvents,
      failedEvents: snapshot.summary.failedEvents,
      limit: query.limit,
      openSinkFailures: snapshot.summary.openSinkFailures,
      recentEvents: snapshot.summary.recentEvents,
      status: snapshot.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    summary: "Read platform observability snapshot",
    tenantId: null,
  });

  return snapshot;
}
