// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardLeadSourcesPanel } from "./DashboardLeadSourcesPanel";

vi.mock("./DashboardHomeEntry", () => ({
  DashboardHomeEntry: ({ children }: { children: ReactNode }) => children,
}));

describe("DashboardLeadSourcesPanel", () => {
  afterEach(cleanup);

  it("keeps the panel structure without exposing analytics data", () => {
    render(<DashboardLeadSourcesPanel dashboard={null} />);

    expect(screen.getByText("Canais de Lead")).toBeVisible();
    expect(
      screen.getByLabelText("Dados de canais de lead indisponíveis"),
    ).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(6);
    expect(screen.queryByText("Aguardando captação de leads.")).toBeNull();
  });

  it("keeps the real empty state when analytics is available", () => {
    render(<DashboardLeadSourcesPanel dashboard={emptyDashboard} />);

    expect(screen.getByText("Aguardando captação de leads.")).toBeVisible();
    expect(
      screen.queryByLabelText("Dados de canais de lead indisponíveis"),
    ).toBeNull();
  });
});

const emptyDashboard: AnalyticsDashboard = {
  generatedAt: "2026-08-12T12:00:00.000Z",
  inventory: {
    averagePriceCents: 0,
    availableListings: 0,
    reservedListings: 0,
    soldListings: 0,
    totalListings: 0,
  },
  kpis: [],
  leadFunnel: [],
  leadSources: [],
  revenue: {
    closedSalesCents: 0,
    grossMarginCents: 0,
    openReceivablesCents: 0,
    paidReceiptsCents: 0,
  },
  storeId: "store_1",
  tenantId: "tenant_1",
};
