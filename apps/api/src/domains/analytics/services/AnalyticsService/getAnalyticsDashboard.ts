import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { AnalyticsDashboard } from "../../ports/analyticsRepository.js";
import {
  requireAnalyticsScope,
  type AnalyticsServicePorts,
} from "./serviceSupport.js";

export async function getAnalyticsDashboard(
  context: ServiceContext,
  ports: AnalyticsServicePorts,
): Promise<AnalyticsDashboard> {
  assertPermission(context, "analytics.read");
  const scope = requireAnalyticsScope(context);

  context.logger.info(
    "analytics.dashboard.read.started",
    createServiceLogMetadata(context),
  );

  const dashboard = await ports.analyticsRepository.getDashboard(scope);

  await context.audit.record({
    action: "analytics.dashboard.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "analytics_dashboard",
    metadata: {
      availableListings: dashboard.inventory.availableListings,
      closedSalesCents: dashboard.revenue.closedSalesCents,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read commercial analytics dashboard",
  });

  return dashboard;
}
