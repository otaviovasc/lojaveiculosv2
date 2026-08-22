import {
  createAnalyticsServices,
  type AnalyticsServices,
} from "../../features/analytics/controllers/analyticsServices.js";
import { getAttention } from "./runtimeAnalyticsAttention.js";
import { getHomeInventory, getInventory } from "./runtimeAnalyticsInventory.js";
import {
  getActiveLeadCount,
  getLeadFunnel,
  getLeadSources,
} from "./runtimeAnalyticsLeads.js";
import { getRevenue, getSalesMetrics } from "./runtimeAnalyticsSales.js";
import {
  getFinanceReport,
  getOwnerReport,
} from "./runtimeAnalyticsFinanceReports.js";
import {
  getCrmReport,
  getDocumentsReport,
} from "./runtimeAnalyticsOperationalReports.js";
import {
  available,
  marketingAvailability,
  restricted,
} from "./runtimeAnalyticsReportAvailability.js";
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
      async getHomeDashboard(input) {
        const [inventory, activeLeads] = await Promise.all([
          getHomeInventory(db, input),
          getActiveLeadCount(db, input),
        ]);
        return {
          generatedAt: new Date(),
          inventory,
          leadSummary: { activeLeads },
          storeId: input.storeId,
          tenantId: input.tenantId,
        };
      },
      async getDashboard(input) {
        const [
          inventory,
          revenue,
          salesMetrics,
          attention,
          funnel,
          sources,
          owner,
          finance,
          crm,
          documents,
        ] = await Promise.all([
          getInventory(db, input),
          getRevenue(db, input),
          getSalesMetrics(db, input),
          getAttention(db, input),
          getLeadFunnel(db, input),
          getLeadSources(db, input),
          getOwnerReport(db, input, input.access.finance),
          getFinanceReport(db, input, input.access.finance),
          getCrmReport(db, input, input.access.crm),
          getDocumentsReport(db, input, input.access.documents),
        ]);
        const canReadFinance = input.access.finance;
        return {
          attention: canReadFinance
            ? attention
            : {
                ...attention,
                overdueReceivablesCents: null,
                overdueReceivablesCount: null,
              },
          financialAvailability: canReadFinance
            ? available
            : restricted("finance.read"),
          generatedAt: new Date(),
          inventory,
          kpis: createKpis(
            inventory,
            revenue,
            salesMetrics,
            funnel,
            canReadFinance,
          ),
          leadFunnel: funnel,
          leadSources: sources,
          period: input.period,
          revenue: canReadFinance
            ? revenue
            : {
                closedSalesCents: null,
                openReceivablesCents: null,
                paidReceiptsCents: null,
              },
          sales: canReadFinance
            ? salesMetrics
            : {
                ...salesMetrics,
                avgTicketCents: null,
                grossMarginCents: null,
                revenueCents: null,
              },
          owner,
          finance,
          crm,
          documents,
          marketing: { availability: marketingAvailability },
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
  canReadFinance: boolean,
) {
  return [
    ...(canReadFinance
      ? [
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
        ]
      : []),
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
