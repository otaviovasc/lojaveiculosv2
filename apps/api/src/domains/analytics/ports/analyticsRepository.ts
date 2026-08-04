export type AnalyticsKpi = {
  deltaLabel: string;
  label: string;
  value: string;
};

export type AnalyticsFunnelStep = {
  count: number;
  key: string;
  label: string;
};

export type AnalyticsBreakdown = {
  key: string;
  label: string;
  value: number;
};

export type AnalyticsPeriod = {
  from: string;
  to: string;
};

export type AnalyticsDashboard = {
  attention: {
    overdueReceivablesCents: number;
    overdueReceivablesCount: number;
    pendingChecklistsCount: number;
  };
  generatedAt: Date;
  inventory: {
    ageBuckets: {
      days0to30: number;
      days31to60: number;
      days61to90: number;
      over90: number;
    };
    averagePriceCents: number;
    availableListings: number;
    reservedListings: number;
    soldListings: number;
    totalListings: number;
  };
  kpis: readonly AnalyticsKpi[];
  leadFunnel: readonly AnalyticsFunnelStep[];
  leadSources: readonly AnalyticsBreakdown[];
  period: AnalyticsPeriod;
  revenue: {
    closedSalesCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
  };
  sales: {
    avgTicketCents: number;
    closedCount: number;
    grossMarginCents: number;
    revenueCents: number;
  };
  storeId: string;
  tenantId: string;
};

export type AnalyticsRepository = {
  getDashboard: (input: {
    period: AnalyticsPeriod;
    storeId: string;
    tenantId: string;
  }) => Promise<AnalyticsDashboard>;
};
