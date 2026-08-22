export type AgencyStatsPeriod = {
  from: string;
  to: string;
};

export type AgencyStatsStoreOption = {
  storeId: string;
  storeName: string;
  storeSlug: string;
};

export type AgencyStatsStoreRow = AgencyStatsStoreOption & {
  inventory: {
    availableListings: number;
    reservedUnits: number;
    totalListings: number;
  };
  leads: {
    activeCount: number;
    conversionRate: number;
    totalCount: number;
    wonCount: number;
  };
  sales: {
    averageTicketCents: number;
    closedCount: number;
    grossMarginCents: number;
    revenueCents: number;
  };
};

export type AgencyStatsReport = {
  availableStores: readonly AgencyStatsStoreOption[];
  generatedAt: Date;
  leadSources: readonly {
    count: number;
    key: string;
    label: string;
  }[];
  period: AgencyStatsPeriod;
  scopeStoreId: string | null;
  stores: readonly AgencyStatsStoreRow[];
  tenantId: string;
  totals: {
    inventory: AgencyStatsStoreRow["inventory"];
    leads: AgencyStatsStoreRow["leads"];
    sales: AgencyStatsStoreRow["sales"];
    storeCount: number;
  };
};

export type AgencyStatsRepository = {
  getStats: (input: {
    period: AgencyStatsPeriod;
    storeId?: string;
    tenantId: string;
  }) => Promise<AgencyStatsReport>;
};

export class AgencyStatsStoreNotFoundError extends Error {
  constructor() {
    super("The selected store does not belong to this agency tenant.");
    this.name = "AgencyStatsStoreNotFoundError";
  }
}
