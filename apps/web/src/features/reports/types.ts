export type ReportsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type ReportsPeriod = {
  from: string;
  to: string;
};

export type ReportsDashboard = {
  generatedAt: string;
  period: ReportsPeriod;
  kpis: readonly { deltaLabel: string; label: string; value: string }[];
  leadFunnel: readonly { count: number; key: string; label: string }[];
  leadSources: readonly { key: string; label: string; value: number }[];
  revenue: {
    closedSalesCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
  };
  sales: {
    closedCount: number;
    revenueCents: number;
    avgTicketCents: number;
    grossMarginCents: number;
  };
  inventory: {
    averagePriceCents: number;
    availableListings: number;
    reservedListings: number;
    soldListings: number;
    totalListings: number;
    ageBuckets: {
      days0to30: number;
      days31to60: number;
      days61to90: number;
      over90: number;
    };
  };
  attention: {
    overdueReceivablesCents: number;
    overdueReceivablesCount: number;
    pendingChecklistsCount: number;
  };
};
