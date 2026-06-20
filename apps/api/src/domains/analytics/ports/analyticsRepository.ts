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

export type AnalyticsDashboard = {
  generatedAt: Date;
  inventory: {
    averagePriceCents: number;
    availableListings: number;
    reservedListings: number;
    soldListings: number;
    totalListings: number;
  };
  kpis: readonly AnalyticsKpi[];
  leadFunnel: readonly AnalyticsFunnelStep[];
  leadSources: readonly AnalyticsBreakdown[];
  revenue: {
    closedSalesCents: number;
    grossMarginCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
  };
  storeId: string;
  tenantId: string;
};

export type AnalyticsRepository = {
  getDashboard: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<AnalyticsDashboard>;
};
