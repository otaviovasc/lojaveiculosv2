import { Banknote, MessageCircle, Target, TrendingUp } from "lucide-react";
import type { AnalyticsDashboard, DashboardStatViewModel } from "./types";

const statTones = ["green", "blue", "violet", "pink"] as const;
const statIcons = [Banknote, Target, TrendingUp, MessageCircle] as const;

export const fallbackDashboardStats: DashboardStatViewModel[] = [
  {
    deltaLabel: "—",
    icon: Banknote,
    label: "Faturamento",
    tone: "green",
    value: "—",
  },
  {
    deltaLabel: "—",
    icon: Target,
    label: "Ticket médio",
    tone: "blue",
    value: "—",
  },
  {
    deltaLabel: "—",
    icon: TrendingUp,
    label: "Conversão",
    tone: "violet",
    value: "—",
  },
  {
    deltaLabel: "—",
    icon: MessageCircle,
    label: "Leads WhatsApp",
    tone: "pink",
    value: "—",
  },
];

export function createDashboardStats(
  dashboard: AnalyticsDashboard | null,
): DashboardStatViewModel[] {
  if (!dashboard) return fallbackDashboardStats;
  const canReadFinance =
    dashboard.financialAvailability.status === "available" &&
    dashboard.revenue.closedSalesCents !== null;
  const conversion = calculateConversionRate(dashboard);
  const whatsapp = dashboard.leadSources.find((source) =>
    source.key.toLowerCase().includes("whatsapp"),
  );
  const defaults = [
    {
      deltaLabel: canReadFinance
        ? (dashboard.kpis[0]?.deltaLabel ?? "período atual")
        : "Acesso financeiro restrito",
      label: "Faturamento",
      value: canReadFinance
        ? money(dashboard.revenue.closedSalesCents ?? 0)
        : "—",
    },
    {
      deltaLabel: canReadFinance
        ? `${dashboard.sales.closedCount} vendas fechadas`
        : "Acesso financeiro restrito",
      label: "Ticket médio",
      value:
        canReadFinance && dashboard.sales.avgTicketCents !== null
          ? money(dashboard.sales.avgTicketCents)
          : "—",
    },
    {
      deltaLabel: `${wonLeads(dashboard)} ganhos no funil`,
      label: "Conversão",
      value: `${conversion}%`,
    },
    {
      deltaLabel: "origem WhatsApp",
      label: "Leads WhatsApp",
      value: String(whatsapp?.value ?? 0),
    },
  ];
  return defaults.map((stat, index) => ({
    ...stat,
    icon: statIcons[index] ?? Banknote,
    tone: statTones[index] ?? "green",
  }));
}

export function totalLeads(dashboard: AnalyticsDashboard) {
  return dashboard.leadFunnel.reduce((sum, step) => sum + step.count, 0);
}

export function topLeadSources(dashboard: AnalyticsDashboard) {
  return [...dashboard.leadSources]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

export function updatedAtLabel(dashboard: AnalyticsDashboard | null) {
  if (!dashboard) return "Aguardando primeira leitura";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dashboard.generatedAt));
}

export function inventoryRotationLabel(dashboard: AnalyticsDashboard | null) {
  if (!dashboard) return "Sem leitura de estoque";
  return `${dashboard.inventory.availableListings}/${dashboard.inventory.totalListings} disponíveis`;
}

export function receivablesLabel(dashboard: AnalyticsDashboard | null) {
  if (!dashboard) return "Recebíveis indisponíveis";
  if (
    dashboard.financialAvailability.status !== "available" ||
    dashboard.revenue.openReceivablesCents === null
  ) {
    return "Recebíveis restritos";
  }
  return `${money(dashboard.revenue.openReceivablesCents)} em aberto`;
}

function calculateConversionRate(dashboard: AnalyticsDashboard) {
  const total = totalLeads(dashboard);
  if (total === 0) return 0;
  return Math.round((wonLeads(dashboard) / total) * 100);
}

function wonLeads(dashboard: AnalyticsDashboard) {
  return dashboard.leadFunnel
    .filter((step) => ["won", "closed_won", "converted"].includes(step.key))
    .reduce((sum, step) => sum + step.count, 0);
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}
