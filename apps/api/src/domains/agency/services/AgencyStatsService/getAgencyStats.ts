import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  AgencyStatsPeriod,
  AgencyStatsReport,
} from "../../ports/agencyStatsRepository.js";
import {
  requireAgencyStatsScope,
  type AgencyStatsServicePorts,
} from "./serviceSupport.js";

export async function getAgencyStats(
  context: ServiceContext,
  ports: AgencyStatsServicePorts,
  input: { period: AgencyStatsPeriod; storeId?: string },
): Promise<AgencyStatsReport> {
  assertPermission(context, "analytics.read");
  const scope = requireAgencyStatsScope(context);

  context.logger.info(
    "agency.stats.read.started",
    createServiceLogMetadata(context, {
      from: input.period.from,
      scopeStoreId: input.storeId ?? null,
      to: input.period.to,
    }),
  );

  const report = await ports.agencyStatsRepository.getStats({
    period: input.period,
    ...(input.storeId ? { storeId: input.storeId } : {}),
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "agency.stats.read",
    actor: context.actor,
    category: "data_access",
    entityId: input.storeId ?? scope.tenantId,
    entityType: input.storeId ? "agency_store_stats" : "agency_network_stats",
    metadata: {
      closedSalesCount: report.totals.sales.closedCount,
      from: input.period.from,
      leadCount: report.totals.leads.totalCount,
      scopeStoreId: input.storeId ?? null,
      storeCount: report.totals.storeCount,
      to: input.period.to,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: input.storeId ?? null,
    tenantId: scope.tenantId,
    summary: "Read agency commercial statistics",
  });

  return report;
}
