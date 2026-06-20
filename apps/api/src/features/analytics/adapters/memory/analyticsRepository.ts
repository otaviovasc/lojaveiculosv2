import type {
  AnalyticsDashboard,
  AnalyticsRepository,
} from "../../../../domains/analytics/ports/analyticsRepository.js";

export function createMemoryAnalyticsRepository(): AnalyticsRepository {
  return {
    async getDashboard(input): Promise<AnalyticsDashboard> {
      return {
        generatedAt: new Date(),
        inventory: {
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
        revenue: {
          closedSalesCents: 74200000,
          grossMarginCents: 9340000,
          openReceivablesCents: 8650000,
          paidReceiptsCents: 31100000,
        },
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
  };
}
