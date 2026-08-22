import { describe, expect, it } from "vitest";
import {
  createDashboardStats,
  inventoryRotationLabel,
  receivablesLabel,
  topLeadSources,
} from "./dashboardModel";
import type { AnalyticsDashboard } from "./types";

const dashboard: AnalyticsDashboard = {
  financialAvailability: { status: "available" },
  generatedAt: "2026-06-22T17:00:00.000Z",
  inventory: {
    averagePriceCents: 12000000,
    availableListings: 4,
    reservedListings: 1,
    soldListings: 9,
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
    openReceivablesCents: 100000,
    paidReceiptsCents: 0,
  },
  sales: {
    avgTicketCents: 12000000,
    closedCount: 2,
  },
  storeId: "store_1",
  tenantId: "tenant_1",
};

describe("dashboard model", () => {
  it("maps V2 analytics into Loja dashboard metrics", () => {
    const stats = createDashboardStats(dashboard);

    expect(stats.map((stat) => stat.label)).toEqual([
      "Faturamento",
      "Ticket médio",
      "Conversão",
      "Leads WhatsApp",
    ]);
    expect(stats.map((stat) => normalizeSpaces(stat.value))).toEqual([
      "R$ 240.000",
      "R$ 120.000",
      "20%",
      "5",
    ]);
  });

  it("keeps operational labels grounded in the backend summary", () => {
    expect(inventoryRotationLabel(dashboard)).toBe("4/7 disponíveis");
    expect(normalizeSpaces(receivablesLabel(dashboard))).toBe(
      "R$ 1.000 em aberto",
    );
    expect(topLeadSources(dashboard)[0]?.label).toBe("WhatsApp");
  });

  it("uses period sales for ticket metrics instead of historical sold inventory", () => {
    const stats = createDashboardStats(dashboard);

    expect(dashboard.inventory.soldListings).toBe(9);
    expect(stats[1]).toMatchObject({
      deltaLabel: "2 vendas fechadas no período",
      label: "Ticket médio",
    });
    expect(normalizeSpaces(stats[1]?.value ?? "")).toBe("R$ 120.000");
  });

  it("shows restricted financial metrics as unavailable instead of zero", () => {
    const restricted: AnalyticsDashboard = {
      ...dashboard,
      financialAvailability: {
        reason: "Este perfil não possui a permissão finance.read.",
        status: "restricted",
      },
      kpis: dashboard.kpis.filter((kpi) => kpi.label !== "GMV"),
      revenue: {
        closedSalesCents: null,
        openReceivablesCents: null,
        paidReceiptsCents: null,
      },
      sales: {
        avgTicketCents: null,
        closedCount: 2,
      },
    };

    const stats = createDashboardStats(restricted);
    expect(stats[0]).toMatchObject({
      deltaLabel: "Acesso financeiro restrito",
      label: "Faturamento",
      value: "—",
    });
    expect(stats[1]).toMatchObject({
      deltaLabel: "Acesso financeiro restrito",
      label: "Ticket médio",
      value: "—",
    });
    expect(receivablesLabel(restricted)).toBe("Recebíveis restritos");
  });
});

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}
