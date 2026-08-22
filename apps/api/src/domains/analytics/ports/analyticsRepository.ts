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

export type AnalyticsReportAccess = {
  crm: boolean;
  documents: boolean;
  finance: boolean;
};

export type AnalyticsReportAvailability =
  | { status: "available" }
  | { reason: string; status: "restricted" | "unavailable" };

export type AnalyticsOwnerVehicle = {
  acquisitionCents: number;
  closedAt: Date;
  commissionCents: number;
  marginCents: number | null;
  marginStatus: "complete" | "missing_acquisition";
  operationalCostsCents: number;
  plate: string | null;
  saleId: string;
  salePriceCents: number;
  title: string;
  totalCostCents: number;
  unitId: string | null;
};

export type HomeDashboard = {
  generatedAt: Date;
  inventory: {
    availableListings: number;
    totalListings: number;
  };
  leadSummary: {
    activeLeads: number;
  };
  storeId: string;
  tenantId: string;
};

export type AnalyticsDashboard = {
  attention: {
    overdueReceivablesCents: number | null;
    overdueReceivablesCount: number | null;
    pendingChecklistsCount: number;
  };
  financialAvailability: AnalyticsReportAvailability;
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
    availableAskingValueCents: number;
  };
  kpis: readonly AnalyticsKpi[];
  leadFunnel: readonly AnalyticsFunnelStep[];
  leadSources: readonly AnalyticsBreakdown[];
  period: AnalyticsPeriod;
  revenue: {
    closedSalesCents: number | null;
    openReceivablesCents: number | null;
    paidReceiptsCents: number | null;
  };
  sales: {
    avgTicketCents: number | null;
    closedCount: number;
    grossMarginCents: number | null;
    revenueCents: number | null;
  };
  owner: {
    availability: AnalyticsReportAvailability;
    officialMarginCents: number;
    completeSalesCount: number;
    missingAcquisitionCount: number;
    vehicles: readonly AnalyticsOwnerVehicle[];
  };
  finance: {
    availability: AnalyticsReportAvailability;
    categoryBreakdown: readonly {
      count: number;
      key: string;
      paidCents: number;
      plannedCents: number;
    }[];
    paidOutflowCents: number;
    pendingOutflowCents: number;
    plannedOutflowCents: number;
    plannedRevenueCents: number;
    realizedBalanceCents: number;
    receivedRevenueCents: number;
  };
  crm: {
    availability: AnalyticsReportAvailability;
    averageInteractionsPerLead: number;
    conversionRate: number;
    interactionCount: number;
    lostLeads: number;
    totalLeads: number;
    wonLeads: number;
  };
  documents: {
    availability: AnalyticsReportAvailability;
    byKind: readonly { count: number; key: string }[];
    issued: number;
    pendingSignature: number;
    signed: number;
    total: number;
  };
  marketing: {
    availability: AnalyticsReportAvailability;
  };
  storeId: string;
  tenantId: string;
};

export type AnalyticsRepository = {
  getDashboard: (input: {
    access: AnalyticsReportAccess;
    period: AnalyticsPeriod;
    storeId: string;
    tenantId: string;
  }) => Promise<AnalyticsDashboard>;
  getHomeDashboard: (input: {
    period: AnalyticsPeriod;
    storeId: string;
    tenantId: string;
  }) => Promise<HomeDashboard>;
};
