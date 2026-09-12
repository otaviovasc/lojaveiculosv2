export type ReportsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type ReportsPeriod = {
  from: string;
  to: string;
};

export type ReportAvailability =
  | { status: "available" }
  | { reason: string; status: "restricted" | "unavailable" };

export type ReportTab =
  | "summary"
  | "sold"
  | "costs"
  | "finance"
  | "crm"
  | "inventory"
  | "documents"
  | "marketing";

export type ReportsDashboard = {
  financialAvailability: ReportAvailability;
  generatedAt: string;
  period: ReportsPeriod;
  kpis: readonly { deltaLabel: string; label: string; value: string }[];
  leadFunnel: readonly { count: number; key: string; label: string }[];
  leadSources: readonly { key: string; label: string; value: number }[];
  revenue: {
    closedSalesCents: number | null;
    openReceivablesCents: number | null;
    paidReceiptsCents: number | null;
  };
  sales: {
    closedCount: number;
    revenueCents: number | null;
    avgTicketCents: number | null;
    grossMarginCents: number | null;
  };
  inventory: {
    averagePriceCents: number;
    availableAskingValueCents: number;
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
    overdueReceivablesCents: number | null;
    overdueReceivablesCount: number | null;
    pendingChecklistsCount: number;
  };
  owner: {
    availability: ReportAvailability;
    completeSalesCount: number;
    missingAcquisitionCount: number;
    officialMarginCents: number;
    vehicles: readonly OwnerVehicleReportRow[];
  };
  finance: {
    availability: ReportAvailability;
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
    availability: ReportAvailability;
    averageInteractionsPerLead: number;
    conversionRate: number;
    interactionCount: number;
    lostLeads: number;
    totalLeads: number;
    wonLeads: number;
  };
  documents: {
    availability: ReportAvailability;
    byKind: readonly { count: number; key: string }[];
    issued: number;
    pendingSignature: number;
    signed: number;
    total: number;
  };
  marketing: { availability: ReportAvailability };
};

export type OwnerVehicleReportRow = {
  acquisitionCents: number;
  closedAt: string;
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
