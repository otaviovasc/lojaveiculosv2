import { Banknote, Bot, Target, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./ui/CountUp";
import type { createDashboardStats } from "../features/analytics/dashboardModel";
import { DASHBOARD_KPI_ENTRY_DELAY_STEP } from "../features/analytics/dashboardHomeAnimation";
import { DashboardHomeEntry } from "./DashboardHomeEntry";
import type { ModuleId } from "../app/modules";

type DashboardStat = ReturnType<typeof createDashboardStats>[number];

export function DashboardHomeKpis({
  canViewAnalytics,
  onNavigate,
  stats,
}: {
  canViewAnalytics: boolean;
  onNavigate: (moduleId: ModuleId) => void;
  stats: DashboardStat[];
}) {
  return (
    <div className="kpi-counters-grid">
      {stats.map((stat, idx) => {
        const KpiIcon = getKpiIcon(stat.label);
        const cardContent = (
          <>
            {canViewAnalytics ? <div className="gloss-overlay" /> : null}
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <KpiIcon className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">{stat.deltaLabel}</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">{stat.label}</p>
                <p className="kpi-card-value">
                  <AnimatedCounter value={stat.value} />
                </p>
              </div>
            </div>
            <KpiIcon className="kpi-bg-icon text-white" />
          </>
        );
        return (
          <DashboardHomeEntry
            key={stat.label}
            delay={idx * DASHBOARD_KPI_ENTRY_DELAY_STEP}
          >
            {canViewAnalytics ? (
              <button
                aria-label={`${stat.label}: ${stat.value}. ${stat.deltaLabel}. Abrir relatórios`}
                className={getInteractiveKpiClass(stat.tone)}
                onClick={() => onNavigate("reports")}
                type="button"
              >
                {cardContent}
              </button>
            ) : (
              <div className={getStaticKpiClass(stat.tone)}>{cardContent}</div>
            )}
          </DashboardHomeEntry>
        );
      })}
    </div>
  );
}

function getInteractiveKpiClass(tone: string) {
  switch (tone) {
    case "green":
      return "kpi-card-premium kpi-gradient-green group w-full text-left transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
    case "blue":
      return "kpi-card-premium kpi-gradient-blue group w-full text-left transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
    case "violet":
      return "kpi-card-premium kpi-gradient-violet group w-full text-left transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
    case "pink":
    default:
      return "kpi-card-premium kpi-gradient-pink group w-full text-left transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  }
}

function getStaticKpiClass(tone: string) {
  switch (tone) {
    case "green":
      return "kpi-card-premium kpi-gradient-green";
    case "blue":
      return "kpi-card-premium kpi-gradient-blue";
    case "violet":
      return "kpi-card-premium kpi-gradient-violet";
    case "pink":
    default:
      return "kpi-card-premium kpi-gradient-pink";
  }
}

function getKpiIcon(label: string) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("faturamento")) return Banknote;
  if (lowerLabel.includes("medio") || lowerLabel.includes("médio")) {
    return Target;
  }
  if (lowerLabel.includes("conversao") || lowerLabel.includes("conversão")) {
    return TrendingUp;
  }
  return Bot;
}
