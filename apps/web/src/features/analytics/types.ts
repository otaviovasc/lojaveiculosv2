import type { ComponentType } from "react";

export type AnalyticsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

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

export type AnalyticsFinancialAvailability =
  | { status: "available" }
  | { reason: string; status: "restricted" | "unavailable" };

export type HomeDashboard = {
  generatedAt: string;
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
  financialAvailability: AnalyticsFinancialAvailability;
  generatedAt: string;
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
    closedSalesCents: number | null;
    openReceivablesCents: number | null;
    paidReceiptsCents: number | null;
  };
  sales: {
    avgTicketCents: number | null;
    closedCount: number;
  };
  storeId: string;
  tenantId: string;
};

export type DashboardStatTone = "green" | "blue" | "violet" | "pink";

export type DashboardStatViewModel = {
  deltaLabel: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: DashboardStatTone;
  value: string;
};

export type DashboardLoadStatus =
  | { kind: "error"; message: string; statusCode?: number }
  | { kind: "loading" }
  | { kind: "ready" };
