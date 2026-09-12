import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  AnalyticsPeriod,
  HomeDashboard,
} from "../../ports/analyticsRepository.js";
import {
  requireDashboardScope,
  type AnalyticsServicePorts,
} from "./serviceSupport.js";

export async function getHomeDashboard(
  context: ServiceContext,
  ports: AnalyticsServicePorts,
  input: { period: AnalyticsPeriod },
): Promise<HomeDashboard> {
  assertPermission(context, "dashboard.read");
  const scope = requireDashboardScope(context);

  context.logger.info(
    "dashboard.home.read.started",
    createServiceLogMetadata(context),
  );

  const dashboard = await ports.analyticsRepository.getHomeDashboard({
    period: input.period,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "dashboard.home.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "home_dashboard",
    metadata: {
      activeLeads: dashboard.leadSummary.activeLeads,
      availableListings: dashboard.inventory.availableListings,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read core store dashboard",
  });

  return dashboard;
}
