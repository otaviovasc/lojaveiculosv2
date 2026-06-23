import { Banknote, Bot, Target, TrendingUp } from "lucide-react";
import type { AnalyticsDashboard, DashboardStatViewModel } from "./types";

const statTones = ["green", "blue", "violet", "pink"] as const;
const statIcons = [Banknote, Target, TrendingUp, Bot] as const;

export const fallbackDashboardStats: DashboardStatViewModel[] = [
  {
    deltaLabel: "aguardando dados",
    icon: Banknote,
    label: "Faturamento",
    tone: "green",
    value: "R$ 0",
  },
  {
    deltaLabel: "ticket de vendas",
    icon: Target,
    label: "Ticket medio",
    tone: "blue",
    value: "R$ 0",
  },
  {
    deltaLabel: "funil ativo",
    icon: TrendingUp,
    label: "Conversao",
    tone: "violet",
    value: "0%",
  },
  {
    deltaLabel: "origem WhatsApp",
    icon: Bot,
    label: "Leads IA",
    tone: "pink",
    value: "0",
  },
];

export function createDashboardStats(
  dashboard: AnalyticsDashboard | null,
): DashboardStatViewModel[] {
  if (!dashboard) return fallbackDashboardStats;
  const conversion = calculateConversionRate(dashboard);
  const whatsapp = dashboard.leadSources.find((source) =>
    source.key.toLowerCase().includes("whatsapp"),
  );
  const defaults = [
    {
      deltaLabel: dashboard.kpis[0]?.deltaLabel ?? "periodo atual",
      label: "Faturamento",
      value: money(dashboard.revenue.closedSalesCents),
    },
    {
      deltaLabel: `${dashboard.inventory.soldListings} vendas fechadas`,
      label: "Ticket medio",
      value: money(averageTicketCents(dashboard)),
    },
    {
      deltaLabel: `${wonLeads(dashboard)} ganhos no funil`,
      label: "Conversao",
      value: `${conversion}%`,
    },
    {
      deltaLabel: "origem WhatsApp",
      label: "Leads IA",
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
  return `${dashboard.inventory.availableListings}/${dashboard.inventory.totalListings} disponiveis`;
}

export function receivablesLabel(dashboard: AnalyticsDashboard | null) {
  if (!dashboard) return "Recebiveis indisponiveis";
  return `${money(dashboard.revenue.openReceivablesCents)} em aberto`;
}

function averageTicketCents(dashboard: AnalyticsDashboard) {
  if (dashboard.inventory.soldListings <= 0) return 0;
  return Math.round(
    dashboard.revenue.closedSalesCents / dashboard.inventory.soldListings,
  );
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
