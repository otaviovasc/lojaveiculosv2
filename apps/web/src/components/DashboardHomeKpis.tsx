import { Banknote, Bot, Target, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./ui/CountUp";
import type { createDashboardStats } from "../features/analytics/dashboardModel";
import { DASHBOARD_KPI_ENTRY_DELAY_STEP } from "../features/analytics/dashboardHomeAnimation";
import { DashboardHomeEntry } from "./DashboardHomeEntry";

type DashboardStat = ReturnType<typeof createDashboardStats>[number];

export function DashboardHomeKpis({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="kpi-counters-grid">
      {stats.map((stat, idx) => {
        const KpiIcon = getKpiIcon(stat.label);
        return (
          <DashboardHomeEntry
            key={stat.label}
            delay={idx * DASHBOARD_KPI_ENTRY_DELAY_STEP}
          >
            <div
              className={`kpi-card-premium ${getKpiToneClass(stat.tone)} group cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02]`}
            >
              <div className="gloss-overlay" />
              <div className="kpi-card-content">
                <div className="kpi-card-header">
                  <div className="kpi-icon-container">
                    <KpiIcon className="size-5.5 text-white" />
                  </div>
                  <span className="kpi-card-badge">{stat.deltaLabel}</span>
                </div>
                <div className="kpi-card-body">
                  <p className="kpi-card-label">{stat.label}</p>
                  <h3 className="kpi-card-value">
                    <AnimatedCounter value={stat.value} />
                  </h3>
                </div>
              </div>
              <KpiIcon className="kpi-bg-icon text-white" />
            </div>
          </DashboardHomeEntry>
        );
      })}
    </div>
  );
}

function getKpiToneClass(tone: string) {
  switch (tone) {
    case "green":
      return "kpi-gradient-green";
    case "blue":
      return "kpi-gradient-blue";
    case "violet":
      return "kpi-gradient-violet";
    case "pink":
    default:
      return "kpi-gradient-pink";
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
