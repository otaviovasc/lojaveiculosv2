import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { renderAnalyticsExecutiveReportPdf } from "../../documents/analyticsExecutiveReportPdf.js";
import type { AnalyticsPeriod } from "../../ports/analyticsRepository.js";
import { getAnalyticsDashboard } from "./getAnalyticsDashboard.js";
import type { AnalyticsServicePorts } from "./serviceSupport.js";

export type AnalyticsExecutiveReport = {
  bytes: Uint8Array;
  fileName: string;
};

export async function exportAnalyticsExecutiveReport(
  context: ServiceContext,
  ports: AnalyticsServicePorts,
  input: { period: AnalyticsPeriod },
): Promise<AnalyticsExecutiveReport> {
  assertPermission(context, "finance.read");
  const dashboard = await getAnalyticsDashboard(context, ports, input);
  const bytes = await renderAnalyticsExecutiveReportPdf(dashboard);
  const metadata = {
    byteCount: bytes.byteLength,
    from: input.period.from,
    to: input.period.to,
    vehicleCount: dashboard.owner.vehicles.length,
  };

  context.logger.info(
    "analytics.executive_report.exported",
    createServiceLogMetadata(context, metadata),
  );
  await context.audit.record({
    action: "analytics.executive_report.exported",
    actor: context.actor,
    category: "data_access",
    entityId: dashboard.storeId,
    entityType: "analytics_executive_report",
    metadata,
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: dashboard.storeId,
    summary: "Exported analytics executive PDF report",
    tenantId: dashboard.tenantId,
  });

  return {
    bytes,
    fileName: `relatorio-executivo-${input.period.from}-a-${input.period.to}.pdf`,
  };
}
