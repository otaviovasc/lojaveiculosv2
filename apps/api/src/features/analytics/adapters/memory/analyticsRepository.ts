import type {
  AnalyticsDashboard,
  AnalyticsRepository,
} from "../../../../domains/analytics/ports/analyticsRepository.js";

export function createMemoryAnalyticsRepository(): AnalyticsRepository {
  return {
    async getHomeDashboard(input) {
      return {
        generatedAt: new Date(),
        inventory: {
          availableListings: 18,
          totalListings: 31,
        },
        leadSummary: { activeLeads: 142 },
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
    async getDashboard(input): Promise<AnalyticsDashboard> {
      return {
        attention: {
          overdueReceivablesCents: 1230000,
          overdueReceivablesCount: 3,
          pendingChecklistsCount: 6,
        },
        generatedAt: new Date(),
        inventory: {
          ageBuckets: {
            days0to30: 9,
            days31to60: 5,
            days61to90: 3,
            over90: 1,
          },
          averagePriceCents: 9850000,
          availableListings: 18,
          reservedListings: 3,
          soldListings: 7,
          totalListings: 31,
        },
        kpis: [
          {
            deltaLabel: "+12% vs periodo anterior",
            label: "GMV fechado",
            value: "R$ 742.000",
          },
          {
            deltaLabel: "3 atrasados",
            label: "Recebiveis abertos",
            value: "R$ 86.500",
          },
          { deltaLabel: "5 novos", label: "Leads qualificados", value: "24" },
          { deltaLabel: "8 dias", label: "Idade media estoque", value: "41d" },
        ],
        leadFunnel: [
          { count: 68, key: "new", label: "Novos" },
          { count: 39, key: "contacted", label: "Contatados" },
          { count: 24, key: "qualified", label: "Qualificados" },
          { count: 11, key: "negotiating", label: "Negociando" },
          { count: 7, key: "won", label: "Ganhos" },
        ],
        leadSources: [
          { key: "public_site", label: "Site publico", value: 31 },
          { key: "whatsapp", label: "WhatsApp", value: 18 },
          { key: "olx", label: "OLX", value: 11 },
          { key: "manual", label: "Manual", value: 8 },
        ],
        period: input.period,
        revenue: {
          closedSalesCents: 74200000,
          openReceivablesCents: 8650000,
          paidReceiptsCents: 31100000,
        },
        sales: {
          avgTicketCents: 10600000,
          closedCount: 7,
          grossMarginCents: 9340000,
          revenueCents: 74200000,
        },
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
  };
}
