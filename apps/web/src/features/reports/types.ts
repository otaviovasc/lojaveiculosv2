export type ReportsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type ReportsDashboard = {
  generatedAt: string;
  inventory: {
    averagePriceCents: number;
    availableListings: number;
    reservedListings: number;
    soldListings: number;
    totalListings: number;
  };
  kpis: readonly { deltaLabel: string; label: string; value: string }[];
  leadFunnel: readonly { count: number; key: string; label: string }[];
  leadSources: readonly { key: string; label: string; value: number }[];
  revenue: {
    closedSalesCents: number;
    grossMarginCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
  };
};
