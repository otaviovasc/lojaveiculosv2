import {
  createAnalyticsServices,
  type AnalyticsServices,
} from "../../features/analytics/controllers/analyticsServices.js";
import { getAttention } from "./runtimeAnalyticsAttention.js";
import { getInventory } from "./runtimeAnalyticsInventory.js";
import { getLeadFunnel, getLeadSources } from "./runtimeAnalyticsLeads.js";
import { getRevenue, getSalesMetrics } from "./runtimeAnalyticsSales.js";
import {
  money,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export type { RuntimeAnalyticsClient } from "./runtimeAnalyticsSupport.js";

export function createRuntimeAnalyticsServices(
  db: RuntimeAnalyticsClient,
): AnalyticsServices {
  return createAnalyticsServices({
    analyticsRepository: {
      async getDashboard(input) {
        const [inventory, revenue, salesMetrics, attention, funnel, sources] =
          await Promise.all([
            getInventory(db, input),
            getRevenue(db, input),
            getSalesMetrics(db, input),
            getAttention(db, input),
            getLeadFunnel(db, input),
            getLeadSources(db, input),
          ]);
        return {
          attention,
          generatedAt: new Date(),
          inventory,
          kpis: createKpis(inventory, revenue, salesMetrics, funnel),
          leadFunnel: funnel,
          leadSources: sources,
          period: input.period,
          revenue,
          sales: salesMetrics,
          storeId: input.storeId,
          tenantId: input.tenantId,
        };
      },
    },
  });
}

function createKpis(
  inventory: Awaited<ReturnType<typeof getInventory>>,
  revenue: Awaited<ReturnType<typeof getRevenue>>,
  salesMetrics: Awaited<ReturnType<typeof getSalesMetrics>>,
  funnel: Awaited<ReturnType<typeof getLeadFunnel>>,
) {
  return [
    {
      deltaLabel: `${salesMetrics.closedCount} vendas no periodo`,
      label: "GMV fechado",
      value: money(salesMetrics.revenueCents),
    },
    {
      deltaLabel: "em aberto",
      label: "Recebiveis",
      value: money(revenue.openReceivablesCents),
    },
    {
      deltaLabel: "funil ativo",
      label: "Leads",
      value: String(funnel.reduce((sum, item) => sum + item.count, 0)),
    },
    {
      deltaLabel: "estoque total",
      label: "Disponiveis",
      value: `${inventory.availableListings}/${inventory.totalListings}`,
    },
  ];
}
