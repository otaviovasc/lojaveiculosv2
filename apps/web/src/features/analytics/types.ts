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

export type AnalyticsDashboard = {
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
    closedSalesCents: number;
    grossMarginCents: number;
    openReceivablesCents: number;
    paidReceiptsCents: number;
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
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };
