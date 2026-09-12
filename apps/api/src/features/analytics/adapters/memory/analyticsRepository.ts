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
          overdueReceivablesCents: input.access.finance ? 1230000 : null,
          overdueReceivablesCount: input.access.finance ? 3 : null,
          pendingChecklistsCount: 6,
        },
        financialAvailability: availability(
          input.access.finance,
          "finance.read",
        ),
        generatedAt: new Date(),
        inventory: {
          ageBuckets: {
            days0to30: 9,
            days31to60: 5,
            days61to90: 3,
            over90: 1,
          },
          averagePriceCents: 9850000,
          availableAskingValueCents: 177300000,
          availableListings: 18,
          reservedListings: 3,
          soldListings: 7,
          totalListings: 31,
        },
        kpis: [
          ...(input.access.finance
            ? [
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
              ]
            : []),
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
          closedSalesCents: input.access.finance ? 74200000 : null,
          openReceivablesCents: input.access.finance ? 8650000 : null,
          paidReceiptsCents: input.access.finance ? 31100000 : null,
        },
        sales: {
          avgTicketCents: input.access.finance ? 10600000 : null,
          closedCount: 7,
          grossMarginCents: input.access.finance ? 9340000 : null,
          revenueCents: input.access.finance ? 74200000 : null,
        },
        owner: {
          availability: availability(input.access.finance, "finance.read"),
          completeSalesCount: input.access.finance ? 6 : 0,
          missingAcquisitionCount: input.access.finance ? 1 : 0,
          officialMarginCents: input.access.finance ? 8120000 : 0,
          vehicles: [],
        },
        finance: {
          availability: availability(input.access.finance, "finance.read"),
          categoryBreakdown: [],
          paidOutflowCents: input.access.finance ? 9820000 : 0,
          pendingOutflowCents: input.access.finance ? 2310000 : 0,
          plannedOutflowCents: input.access.finance ? 12130000 : 0,
          plannedRevenueCents: input.access.finance ? 74200000 : 0,
          realizedBalanceCents: input.access.finance ? 21280000 : 0,
          receivedRevenueCents: input.access.finance ? 31100000 : 0,
        },
        crm: {
          availability: availability(input.access.crm, "crm.pipeline.read"),
          averageInteractionsPerLead: input.access.crm ? 3.2 : 0,
          conversionRate: input.access.crm ? 10.3 : 0,
          interactionCount: input.access.crm ? 218 : 0,
          lostLeads: input.access.crm ? 9 : 0,
          totalLeads: input.access.crm ? 68 : 0,
          wonLeads: input.access.crm ? 7 : 0,
        },
        documents: {
          availability: availability(input.access.documents, "documents.read"),
          byKind: input.access.documents
            ? [
                { count: 7, key: "sale_contract" },
                { count: 7, key: "sale_receipt" },
              ]
            : [],
          issued: input.access.documents ? 9 : 0,
          pendingSignature: input.access.documents ? 2 : 0,
          signed: input.access.documents ? 5 : 0,
          total: input.access.documents ? 16 : 0,
        },
        marketing: {
          availability: {
            reason: "Eventos de visitas e cliques ainda nao estao persistidos.",
            status: "unavailable",
          },
        },
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
  };
}

function availability(allowed: boolean, permission: string) {
  return allowed
    ? ({ status: "available" } as const)
    : ({
        reason: `Este perfil nao possui a permissao ${permission}.`,
        status: "restricted" as const,
      } as const);
}
