import { describe, expect, it } from "vitest";
import {
  createDashboardStats,
  inventoryRotationLabel,
  receivablesLabel,
  topLeadSources,
} from "./dashboardModel";
import type { AnalyticsDashboard } from "./types";

const dashboard: AnalyticsDashboard = {
  generatedAt: "2026-06-22T17:00:00.000Z",
  inventory: {
    averagePriceCents: 12000000,
    availableListings: 4,
    reservedListings: 1,
    soldListings: 2,
    totalListings: 7,
  },
  kpis: [{ deltaLabel: "periodo atual", label: "GMV", value: "R$ 240.000" }],
  leadFunnel: [
    { count: 8, key: "new", label: "Novos" },
    { count: 2, key: "won", label: "Ganhos" },
  ],
  leadSources: [
    { key: "manual", label: "Manual", value: 2 },
    { key: "whatsapp", label: "WhatsApp", value: 5 },
  ],
  revenue: {
    closedSalesCents: 24000000,
    grossMarginCents: 0,
    openReceivablesCents: 100000,
    paidReceiptsCents: 0,
  },
  storeId: "store_1",
  tenantId: "tenant_1",
};

describe("dashboard model", () => {
  it("maps V2 analytics into Loja dashboard metrics", () => {
    const stats = createDashboardStats(dashboard);

    expect(stats.map((stat) => stat.label)).toEqual([
      "Faturamento",
      "Ticket medio",
      "Conversao",
      "Leads IA",
    ]);
    expect(stats.map((stat) => normalizeSpaces(stat.value))).toEqual([
      "R$ 240.000",
      "R$ 120.000",
      "20%",
      "5",
    ]);
  });

  it("keeps operational labels grounded in the backend summary", () => {
    expect(inventoryRotationLabel(dashboard)).toBe("4/7 disponiveis");
    expect(normalizeSpaces(receivablesLabel(dashboard))).toBe(
      "R$ 1.000 em aberto",
    );
    expect(topLeadSources(dashboard)[0]?.label).toBe("WhatsApp");
  });
});

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}
